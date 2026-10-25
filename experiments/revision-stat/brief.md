# Revise an approved statistic for two formats

The approved synthetic statistic is `approved.html`. Preserve its six-second
duration and narration schedule while making this editorial revision:

- Replace the target 1,284 with **128,400**.
- Replace the qualifier with **requests completed during the synthetic single-worker test run**.
- Preserve **Source: synthetic fixture** exactly.

Deliver `index.html` at 1920 by 1080 and `portrait.html` at 1080 by 1920. Reflow
the longer copy for each format. Keep local assets under `assets/` and keep all
composition code inside each HTML file. Use the supplied brand fonts and colors.
The base contract's landscape-only format is overridden for `portrait.html`.

Both compositions use the same paused deterministic GSAP timeline contract and
the existing `value`, `qualifier`, and `source` roles. The counter starts from
zero at 0.50 seconds and first reaches the final target at the 2.50-second cue.
Use whole numbers, thousands separators, and tabular digits. Keep the final
number to the end. Preserve the complete 2.50 through 5.50-second reading window:
all three roles must be fully opaque, unclipped, and inside the supplied editorial
safe areas, with no overlapping text or role boxes. In landscape, use five-percent
margins: x=96..1824 and y=54..1026. In portrait, keep the claim, qualifier and source
inside x=54..1026 and y=270..1250; the reserved upper and lower areas are unavailable
for attribution. These are this brief's explicit safe areas, not universal platform
rules. The reading window starts when every role has finished arriving, so starting
a fade at 2.50 seconds does not satisfy it. Keep at least 120 px value height,
40 px qualifier height, and 32 px source height in both outputs.

All claims and timing are synthetic. No audio processing or factual research is
required. Do not remove a qualifier or source to make the layout fit.
