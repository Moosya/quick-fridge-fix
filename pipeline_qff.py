#!/usr/bin/env python3
"""
pipeline_qff.py — Quick Fridge Fix pipeline wrapper.

Thin override of the trading pipeline for the QFF Node.js project.
Overrides: project root, Python bin, test runner (npm test instead of pytest).

Usage:
  python3 pipeline_qff.py --ticket QFF-002
  python3 pipeline_qff.py --ticket QFF-002 --skip-tess
"""

import os
import re
import sys
import subprocess
import argparse

# ── Patch sys.path so we can import the trading pipeline ──────────────────────
TRADING_SCRIPTS = '/Users/dreiai/clawdbot_polymarket_trader/workspace/scripts'
sys.path.insert(0, TRADING_SCRIPTS)

import pipeline as _p

# ── QFF-specific overrides ─────────────────────────────────────────────────────
QFF_ROOT    = '/Users/dreiai/quick-fridge-fix'
PYTHON_BIN  = '/Users/dreiai/clawdbot_polymarket_trader/.venv/bin/python3'  # needs 3.10+ for str|None syntax
NODE_BIN    = '/opt/homebrew/bin/node'
NPM_BIN     = '/opt/homebrew/bin/npm'
JEST_BIN    = os.path.join(QFF_ROOT, 'node_modules', '.bin', 'jest')

# Override pipeline constants
_p.TRADER_ROOT  = QFF_ROOT
_p.PYTHON_BIN   = PYTHON_BIN

# Fix Rex system prompt — QFF is a web app, not a trading system
_p.REX_SYSTEM_PROMPT = """\
You are Rex, a hostile but fair code reviewer for a production web application.
Find real problems. Do not praise. Do not rewrite code. Output ONLY your review.
List AT MOST 5 issues — the most critical ones only. Do not repeat yourself.
Final line MUST be exactly one of:
VERDICT: APPROVE
VERDICT: REVISE
VERDICT: REJECT

APPROVE if: the search/replace blocks correctly implement the task with no bugs.
REVISE if: there are fixable issues (wrong logic, missing change, bad SEARCH match).
REJECT if: the approach is fundamentally wrong and needs a complete rethink.
"""

# Fix Tess system prompt — output Jest, not pytest
_p.TESS_SYSTEM_PROMPT_QFF = """\
You are Tess, a senior test engineer on a Node.js web application.
Output ONLY the complete Jest test additions as plain JavaScript — no explanations, no markdown fences.
The project uses Jest + supertest. Tests go in tests/server.test.js or tests/prompt.test.js.
"""


def run_jest(ticket_id: str) -> tuple:
    """Run npm test in QFF root. Returns (passed, total, output)."""
    result = subprocess.run(
        [NPM_BIN, 'test', '--', '--forceExit'],
        capture_output=True, text=True, cwd=QFF_ROOT,
        env={**os.environ, 'CI': 'true'}
    )
    output = result.stdout + result.stderr
    passed = len(re.findall(r'✓|✔|PASS|passing', output))
    failed = len(re.findall(r'✗|✘|FAIL|failing|×', output))
    # Jest summary line: "X passed, Y failed"
    summary = re.search(r'(\d+) passed', output)
    fail_summary = re.search(r'(\d+) failed', output)
    if summary:
        passed = int(summary.group(1))
    if fail_summary:
        failed = int(fail_summary.group(1))
    total = passed + failed
    _p.log(ticket_id, f'Jest: {passed}/{total} passing')
    return (passed, total, output)


# ── Monkey-patch run_pytest to use Jest ───────────────────────────────────────
def _run_pytest_as_jest(test_file: str) -> tuple:
    # test_file arg is ignored for QFF — we always run the full Jest suite
    ticket_id = getattr(_run_pytest_as_jest, '_ticket_id', 'QFF')
    return run_jest(ticket_id)

_p.run_pytest = _run_pytest_as_jest


# ── Monkey-patch find_ticket to also search QFF team dir ─────────────────────
import glob as _glob

_orig_find_ticket = _p.find_ticket

def _find_ticket_qff(ticket_id: str) -> str:
    # First try the shared tickets dir
    matches = _glob.glob(os.path.join(_p.TICKETS_DIR, f'{ticket_id}-*.md'))
    if matches:
        return sorted(matches)[0]
    # Then try local QFF team dir
    matches = _glob.glob(os.path.join(QFF_ROOT, 'team', f'TICKET-{ticket_id}.md'))
    if matches:
        return sorted(matches)[0]
    raise FileNotFoundError(f'No ticket found for {ticket_id}')

_p.find_ticket = _find_ticket_qff


# ── Monkey-patch extract_functions to handle JS/TS files ─────────────────────
_orig_extract_functions = _p.extract_functions

def _extract_functions_with_js(file_content: str, lang: str = 'python') -> list:
    if lang in ('js', 'javascript', 'ts', 'typescript'):
        # Match: function name(, const name = (, const name = async (
        import re as _re
        functions = []
        pattern = _re.compile(
            r'^(?:async\s+)?function\s+(\w+)\s*\(|'
            r'^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(',
            _re.MULTILINE
        )
        matches = list(pattern.finditer(file_content))
        for i, m in enumerate(matches):
            name = m.group(1) or m.group(2)
            start = m.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(file_content)
            block = file_content[start:end].rstrip()
            functions.append((name, block))
        return functions
    return _orig_extract_functions(file_content, lang)

_p.extract_functions = _extract_functions_with_js


# ── Monkey-patch build_file_section to detect JS lang for extract_functions ───
_orig_build_prefilled = _p.build_prefilled_search_blocks

def _build_prefilled_qff(ticket_content: str, file_section: str) -> str:
    """Same as original but passes correct lang for .js files."""
    if not file_section:
        return ''
    ticket_words = set(re.findall(r'\b[a-z][a-z0-9_]{3,}\b', ticket_content.lower()))
    blocks = []
    file_pattern = re.compile(r'## Current file: (.+?)\n(.*?)(?=\n## Current file:|\Z)', re.DOTALL)
    for m in file_pattern.finditer(file_section):
        rel_path = m.group(1).strip()
        content = m.group(2)
        if rel_path.endswith('.js') or rel_path.endswith('.ts'):
            lang = 'js'
        elif rel_path.endswith('.py'):
            lang = 'python'
        else:
            lang = 'other'
        functions = _p.extract_functions(content, lang)
        for fname, fsrc in functions:
            if fname.lower() in ticket_words or fname.lower().replace('_', '') in ticket_words:
                blocks.append(
                    f'## Pre-filled SEARCH block for `{fname}` in `{rel_path}`\n'
                    f'<<<<<<< SEARCH\n{fsrc}\n=======\n'
                    f'<write your replacement for {fname} here>\n'
                    f'>>>>>>> REPLACE'
                )
    if blocks:
        return '\n\n## Pre-filled SEARCH blocks (copy SEARCH verbatim, write only REPLACE)\n' + '\n\n'.join(blocks)
    return ''

_p.build_prefilled_search_blocks = _build_prefilled_qff


# ── Main ───────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--ticket', required=True)
    parser.add_argument('--skip-tess', action='store_true')
    args = parser.parse_args()

    # Inject ticket_id into jest runner for logging
    _run_pytest_as_jest._ticket_id = args.ticket

    result = _p.main(args.ticket, skip_tess=args.skip_tess)
    print(f'Pipeline result: {result}')
