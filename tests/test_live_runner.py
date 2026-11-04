"""The live runner's accounting guard is checked offline before any real API request."""
import importlib.util
from decimal import Decimal
from pathlib import Path

import pytest

from lecture_backend.core import Problem,Settings,Store

spec=importlib.util.spec_from_file_location('live_runner',Path(__file__).resolve().parents[1]/'scripts/run_live_e2e.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_test_budget_is_cumulative_restores_ceiling_and_keeps_charges(tmp_path):
    store=Store(Settings(data_dir=tmp_path))
    state={'run_id':'offline-guard-check'}
    with module.BudgetGuard(store.path,state,2_000_000):
        assert store.budget()['available_usd']=='2.000000'
        cost=store.reserve('TEST','test',1_500_000,{})
        store.settle(cost)
        with pytest.raises(Problem):
            store.reserve('TEST','test',600_000,{})
    assert store.budget()['ceiling_usd']=='20.000000'
    assert store.budget()['settled_usd']=='1.500000'
    with module.BudgetGuard(store.path,state,2_000_000):
        assert store.budget()['available_usd']=='0.500000'
        with pytest.raises(Problem):
            store.reserve('TEST','test',600_000,{})
        cost=store.reserve('TEST','test',500_000,{})
        store.settle(cost,'uncertain')
    assert store.budget()['ceiling_usd']=='20.000000'
    assert store.budget()['uncertain_usd']=='0.500000'
    assert Decimal(store.budget()['settled_usd'])+Decimal(store.budget()['uncertain_usd'])==2
    assert state['normal_ceiling_restored'] is True


def test_guard_restores_after_failure_and_retains_uncertain_request(tmp_path):
    store=Store(Settings(data_dir=tmp_path))
    state={'run_id':'failure-check'}
    with pytest.raises(RuntimeError):
        with module.BudgetGuard(store.path,state,2_000_000):
            cost=store.reserve('TEST','test',100_000,{})
            store.settle(cost,'uncertain')
            raise RuntimeError('test failure')
    assert store.budget()['ceiling_usd']=='20.000000'
    assert store.budget()['uncertain_usd']=='0.100000'
    with pytest.raises(ValueError):
        module.BudgetGuard(store.path,{},2_000_001)


def test_guard_stays_in_place_until_inflight_job_is_terminal(tmp_path):
    store = Store(Settings(data_dir=tmp_path))
    state = {'run_id': 'inflight-check', 'job_id': 'job_inflight'}
    with store.tx() as cx:
        store.put(cx, 'job', {'id': 'job_inflight', 'status': 'generating', 'created_at': '2026-11-04T00:00:00+00:00'}, 'recording_test')
    with module.BudgetGuard(store.path, state, 2_000_000):
        pass
    assert store.budget()['ceiling_usd'] == '4.000000'
    assert state['normal_ceiling_restored'] is False
    with store.tx() as cx:
        job = store.get(cx, 'job_inflight', 'job')
        job['status'] = 'failed'
        store.put(cx, 'job', job, 'recording_test')
    with module.BudgetGuard(store.path, state, 2_000_000):
        pass
    assert store.budget()['ceiling_usd'] == '20.000000'
    assert state['normal_ceiling_restored'] is True
