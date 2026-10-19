# Experimental revision robustness task

Status: an experimental follow-up motivated by local production-pilot failures.
This follow-up depends on the opt-in narrated-stat contribution. It is outside
`tasks/`, so standard task discovery and published leaderboard results do not
include it. The normal agent runner does not yet support this two-output task.
The prototype was built on that contribution's head
`0cce44f4a01bdbd892f8f84495935c032585da38`; submit it as a dependent change until
the shared narration helper is available upstream.

The test starts with an approved synthetic statistic. An editor changes
the number and qualifier, then asks for landscape and portrait outputs. Each
output must preserve the supplied cue, complete reading window, and source. A
passing landscape cannot compensate for a failing portrait.

The change is 1,284 to 128,400 and a longer qualification:
`requests completed during the synthetic single-worker test run`.
The cue remains 2.50 seconds, the reading window ends at 5.50 seconds, and the
duration remains six seconds. All narration and claims are synthetic fixtures.
No audio recognition, factual validation, visual preference, or revision-history
inference is claimed.

The evaluator reuses the existing stepped-counter and narration checks with
an explicit safe rectangle for each format. It reports per-format results and
does not produce a leaderboard score. Pixel occlusion, contrast, CSS clip paths,
and human readability remain outside these checks. The regular brand, polish,
and determinism checks are not replaced by this experiment.

Artifacts:

- `approved.html`: the unchanged baseline supplied to the model.
- `index.html`: revised 1920 by 1080 composition.
- `portrait.html`: revised 1080 by 1920 composition.
- A manifest carrying the immutable cue/source and explicit replacement copy.
- Reference and naive controls, plus mutations for shortened copy, stale target,
  clipped portrait text, retimed cue, and a one-frame failure during the hold.

## Why this follow-up exists

A local pilot exposed two failures that a landscape-only review can miss:
attribution remained present in the portrait DOM while sitting outside the
editorial safe area, and text began its reveal on the reading cue rather than
being fully visible then. This is a new synthetic reproduction of those failure
classes, with original copy and reference controls. It does not copy a model's
composition or claim comparative model performance.

The portrait brief therefore supplies a smaller explicit safe area and requires
the complete claim to finish arriving by the cue. Keep the entire reading window
intact when changing the number or wrapping the longer qualifier. These safe
areas belong to this fixture and are not universal platform specifications.

Record model/tool budgets and the approved baseline hash separately from the
final outputs. The baseline receipt records the supplied starting file; final
outputs alone cannot prove that an agent edited that file rather than rebuilt it.

## Local use

Install the locked kit packages and Chromium as in the repository README. Choose
a new workspace path; preparation refuses to overwrite an existing directory:

```sh
python experiments/revision-stat/prepare.py /path/to/new-workspace
# Give that workspace's BRIEF.md, CONTRACT.md, BRAND.md and files to the agent.
node experiments/revision-stat/evaluate.mjs /path/to/new-workspace result.json
```

Preparation seeds the unchanged approved baseline as `index.html`. Evaluation is
expected to fail until the editorial revision and `portrait.html` are delivered.
Exit 0 means every experimental check passed in both formats; exit 1 means at
least one check failed. Keep these results apart from `results/`.

```sh
node selftest/revision.test.mjs
python selftest/revision_render.py
```

The browser controls cover both-format success, a landscape layout reused as
portrait, a retimed cue with lost qualification, and clipping of the longer
qualifier. They also reproduce attribution below the portrait safe area and a
source that only begins fading in on the cue. Numeric controls add stale content, missing formats, duplicate roles,
changed duration, and failures on a single frame. These controls make no model
calls.
