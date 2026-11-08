"""Execute a private smoke-mode copy, keeping the published notebook unexecuted."""

import argparse
from pathlib import Path

from jupyter_client import KernelManager
from jupyter_client.kernelspec import KernelSpecManager
import nbformat
from nbclient import NotebookClient


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kernel-prefix", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    notebook = nbformat.read(root / "training/Lecture_Classifier_Training.ipynb", as_version=4)
    config = next(
        index
        for index, cell in enumerate(notebook.cells)
        if "configuration" in cell.metadata.get("tags", [])
    )
    notebook.cells.insert(
        config + 1,
        nbformat.v4.new_code_cell("""RUN_MODE = 'smoke'
EPOCHS = 2
OUTPUT_ROOT = ROOT / 'var/models' / f'SYNTHETIC-notebook-{RUN_ID}'
import socket
original_connect = socket.socket.connect
def local_only(sock, address):
    if isinstance(address, tuple) and address[0] not in ('127.0.0.1', '::1', 'localhost'):
        raise AssertionError('Notebook check cannot contact external services.')
    return original_connect(sock, address)
socket.socket.connect = local_only
"""),
    )
    manager = KernelManager(
        kernel_name="lecture-training",
        kernel_spec_manager=KernelSpecManager(
            kernel_dirs=[str(args.kernel_prefix.resolve() / "share/jupyter/kernels")]
        ),
    )
    try:
        NotebookClient(
            notebook, timeout=180, km=manager, resources={"metadata": {"path": str(root)}}
        ).execute()
    finally:
        if manager.has_kernel:
            manager.shutdown_kernel(now=True)
    nbformat.validate(notebook)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    nbformat.write(notebook, args.output)
    print(f"Executed synthetic notebook check: {args.output}")


if __name__ == "__main__":
    main()
