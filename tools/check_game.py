#!/usr/bin/env python3
"""Run all Mini Saha regression tests before publishing or installing."""
from pathlib import Path
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[1]
helpers = {'game-harness.cjs', 'ws-client.cjs'}
tests = sorted(p for p in (root / 'tests').glob('*.cjs') if p.name not in helpers)
start = time.monotonic()
failed = []
for test in tests:
    try:
        result = subprocess.run(['node', str(test)], cwd=root, capture_output=True,
                                text=True, timeout=90)
        if result.returncode:
            failed.append(test.name)
            print(f'FAIL {test.name}\n{result.stdout}{result.stderr}', flush=True)
        else:
            print(f'PASS {test.name}', flush=True)
    except (subprocess.TimeoutExpired, OSError) as error:
        failed.append(test.name)
        print(f'FAIL {test.name}: {error}', flush=True)
print(f'{len(tests)-len(failed)}/{len(tests)} tests passed in {time.monotonic()-start:.1f}s', flush=True)
if failed:
    print('Failed: '+', '.join(failed), file=sys.stderr)
    sys.exit(1)
