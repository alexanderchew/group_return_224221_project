import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import type { Attempt, QuizSubmission, Segment, StudyPack } from '../../../packages/contracts/consumer';
import type { NativeApi } from './api';
import { acknowledgeOperation, pendingOperation, readOperation } from './operations';
import type { Acknowledged } from './operations';
import { formatTime } from './recorder';
import { SharedButton, styles } from './studyUi';

const tabs = ['Notes', 'Overview', 'Transcript', 'Quiz'] as const;
type Tab = typeof tabs[number];

export function NativeStudy({ api, pack }: { api: NativeApi; pack: StudyPack }) {
  const [tab, setTab] = useState<Tab>('Notes');
  const [segments, setSegments] = useState(pack.transcript_segments);
  const [cursor, setCursor] = useState(pack.transcript_next_cursor);
  const [evidence, setEvidence] = useState<Segment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const guard = useRef(false);

  async function load(refs?: string[]) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api.transcript(pack.recording_id, pack.transcript_revision_id, refs ? undefined : cursor ?? undefined, refs);
      if (result.id !== pack.transcript_revision_id) throw new Error('The laptop returned a different transcript revision.');
      if (refs) {
        setEvidence(result.segments);
        setTab('Transcript');
      } else {
        setSegments(previous => [...new Map([...previous, ...result.segments].map(segment => [segment.id, segment])).values()]);
        setCursor(result.next_cursor);
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The transcript could not be loaded.'); }
    finally { guard.current = false; setBusy(false); }
  }

  const sources = (ids: string[]) => ids.length > 0 && <SharedButton label="Show supporting transcript" disabled={busy} onPress={() => void load(ids)} />;
  const classification = { custom_model: 'Student model', openai_baseline: 'AI baseline', unknown: 'Unclassified' }[pack.classification.source];

  return <View style={styles.section}>
    <Text style={styles.heading}>Study materials</Text>
    {pack.provenance.some(entry => /REPLAY|TEST_DOUBLE|SAVED_OUTPUT/.test(entry.provider)) &&
      <Text style={styles.copy}>Previously generated example · Offline test output</Text>}
    {pack.freshness === 'outdated' && <Text style={styles.copy}>Generated from an earlier transcript.</Text>}
    {pack.warnings.map((warning, index) => <Text key={index} style={styles.copy}>{warning}</Text>)}
    <Text style={styles.copy}>{pack.subject_override ? `Manually selected subject · ${pack.subject_override.subject}` : `${classification}${pack.classification.label ? ` · ${pack.classification.label}` : ''}`}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {tabs.map(name => <Pressable key={name} accessibilityRole="tab" accessibilityState={{ selected: tab === name }}
        style={[styles.button, tab === name && { backgroundColor: '#c8ddd2' }]} onPress={() => { setTab(name); setEvidence(null); }}>
        <Text style={styles.buttonText}>{name}</Text>
      </Pressable>)}
    </View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {tab === 'Notes' && <>
      {!pack.notes.length && <Text style={styles.copy}>Notes are unavailable for this recording.</Text>}
      {pack.notes.map((note, index) => <View key={index} style={styles.section}>
        <Text style={styles.subheading}>{note.heading}</Text>
        {note.points.map((point, pointIndex) => <View key={pointIndex} style={styles.section}><Text style={styles.copy}>{point.text}</Text>{sources(point.evidence_segment_ids)}</View>)}
      </View>)}
    </>}
    {tab === 'Overview' && <>
      <Text style={styles.subheading}>{pack.metadata.title}</Text>
      <Text style={styles.copy}>{pack.metadata.description}</Text>
      {sources(pack.metadata.evidence_segment_ids)}
      {pack.metadata.topics.map((topic, index) => <View key={index} style={styles.section}><Text style={styles.copy}>{topic.text}</Text>{sources(topic.evidence_segment_ids)}</View>)}
    </>}
    {tab === 'Transcript' && <>
      {evidence && <SharedButton label="Show full transcript" onPress={() => setEvidence(null)} />}
      {(evidence ?? segments).map(segment => <View key={segment.id} style={styles.section}>
        <Text style={styles.copy}>{segment.start_seconds === null ? 'Time unavailable' : formatTime(segment.start_seconds)}</Text>
        <Text style={styles.copy}>{segment.text}</Text>
      </View>)}
      {!evidence && !segments.length && <Text style={styles.copy}>No transcript text is available.</Text>}
      {!evidence && cursor && <SharedButton label={busy ? 'Loading…' : 'Load more transcript'} disabled={busy} onPress={() => void load()} />}
    </>}
    <View style={tab !== 'Quiz' && { display: 'none' }}>
      <NativeQuiz api={api} pack={pack} sources={sources} />
    </View>
  </View>;
}

function NativeQuiz({ api, pack, sources }: { api: NativeApi; pack: StudyPack; sources: (ids: string[]) => React.ReactNode }) {
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [pending, setPending] = useState(false);
  const [latest, setLatest] = useState<Acknowledged>();
  const [retaking, setRetaking] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const guard = useRef(false);
  const scope = JSON.stringify([api.origin, 'quiz', pack.id]);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const operation = await readOperation<QuizSubmission>(scope);
        if (operation && 'key' in operation) {
          if (disposed) return;
          setPending(true);
          setAnswers(Object.fromEntries(operation.body.answers.map(answer => [answer.question_id, answer.option_id])));
        } else if (operation) {
          const scored = await api.attempt(operation.id);
          if (disposed) return;
          if (scored.study_pack_id !== pack.id) throw new Error('The laptop returned feedback for a different study pack.');
          setAttempt(scored);
          setLatest(operation);
        }
        if (!disposed) setReady(true);
      } catch (failure) {
        if (!disposed) setError(failure instanceof Error ? failure.message : 'Previous quiz progress could not be restored.');
      }
    })();
    return () => { disposed = true; };
  }, [api, pack.id, scope]);

  const unanswered = pack.questions.filter(question => !answers[question.id]).length;
  async function submit() {
    if (guard.current || !ready || attempt) return;
    guard.current = true;
    setBusy(true);
    setError('');
    try {
      const body: QuizSubmission = {
        study_pack_id: pack.id,
        answers: pack.questions.map(question => ({ question_id: question.id, option_id: answers[question.id] ?? null })),
      };
      const operation = await pendingOperation(scope, body, retaking ? latest : undefined);
      setPending(true);
      setRetaking(false);
      const result = await api.score(pack.recording_id, operation.body, operation.key);
      if (result.study_pack_id !== pack.id) throw new Error('The laptop returned feedback for a different study pack.');
      await acknowledgeOperation(scope, result.id, operation.previousIds);
      setLatest({ id: result.id, previousIds: operation.previousIds });
      setAttempt(result);
      setPending(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The quiz could not be submitted.');
    } finally { guard.current = false; setBusy(false); }
  }

  async function viewAttempt(id: string) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api.attempt(id);
      if (result.study_pack_id !== pack.id) throw new Error('The laptop returned feedback for a different study pack.');
      setAttempt(result);
      setRetaking(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The attempt could not be loaded.');
    } finally { guard.current = false; setBusy(false); }
  }

  const previousIds = latest?.previousIds ?? [];
  const canSubmit = pack.quiz_status === 'available' && pack.freshness === 'current';
  return <View style={styles.section}>
    {!canSubmit && !attempt && <Text style={styles.copy}>{pack.freshness === 'outdated' ? 'This quiz belongs to an earlier transcript.' : 'There is no supported quiz for this study pack.'}</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {attempt ? <>
      <Text accessibilityLiveRegion="polite" style={styles.subheading}>{attempt.correct_count} of {attempt.total_count} correct · {attempt.percentage}%</Text>
      {attempt.practice_revealed && <Text style={styles.copy}>Practice · Solutions previously revealed</Text>}
      {attempt.results.map(result => {
        const question = pack.questions.find(item => item.id === result.question_id);
        const selected = question?.options.find(option => option.id === result.selected_option_id);
        const correct = question?.options.find(option => option.id === result.correct_option_id);
        return <View key={result.question_id} style={styles.section}>
          <Text style={styles.subheading}>{question?.prompt}</Text>
          <Text style={styles.copy}>{result.selected_option_id === null ? 'Unanswered' : result.is_correct ? 'Correct' : 'Incorrect'}</Text>
          {selected && <Text style={styles.copy}>Your answer · {selected.text}</Text>}
          {correct && <Text style={styles.copy}>Correct answer · {correct.text}</Text>}
          <Text style={styles.copy}>{result.explanation}</Text>
          {sources(result.evidence_segment_ids)}
        </View>;
      })}
      {latest?.id === attempt.id && canSubmit && <SharedButton label="Start a new practice attempt" disabled={busy} onPress={() => {
        setAnswers({});
        setAttempt(null);
        setRetaking(true);
      }} />}
      {latest && latest.id !== attempt.id && <SharedButton label="View latest attempt" disabled={busy} onPress={() => void viewAttempt(latest.id)} />}
      {previousIds.map((id, index) => id !== attempt.id &&
        <SharedButton key={id} label={`View earlier attempt ${previousIds.length - index}`} disabled={busy} onPress={() => void viewAttempt(id)} />)}
    </> : canSubmit && <>
      {retaking && latest && <>
        <Text style={styles.copy}>Practice · Solutions previously revealed</Text>
        <SharedButton label="Return to latest attempt" disabled={busy} onPress={() => void viewAttempt(latest.id)} />
      </>}
      {pack.questions.map(question => <View key={question.id} style={styles.section}>
        <Text style={styles.subheading}>{question.prompt}</Text>
        {question.options.map(option => {
          const selected = answers[question.id] === option.id;
          const disabled = !ready || busy || pending;
          return <Pressable key={option.id} disabled={disabled} accessibilityRole="radio" accessibilityState={{ selected, disabled }}
            style={[styles.button, selected && { backgroundColor: '#c8ddd2' }]} onPress={() => setAnswers(previous => ({ ...previous, [question.id]: option.id }))}>
            <Text style={styles.buttonText}>{selected ? '✓ ' : ''}{option.text}</Text>
          </Pressable>;
        })}
      </View>)}
      <Text style={styles.copy}>{unanswered} unanswered</Text>
      <SharedButton label={pending ? 'Retry same submission' : 'Submit answers'} disabled={!ready || busy} onPress={() => {
        if (pending || !unanswered) void submit();
        else Alert.alert('Submit with unanswered questions?', `${unanswered} questions will be left blank.`, [
          { text: 'Keep answering', style: 'cancel' },
          { text: 'Submit answers', onPress: () => void submit() },
        ]);
      }} />
    </>}
  </View>;
}
