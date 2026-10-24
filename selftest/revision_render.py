"""Bounded browser controls for the two-format revision prototype. No model calls."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "experiments/revision-stat"))
from prepare import prepare


def reference(portrait=False):
    html = (ROOT / "selftest/oracle/_spoken-stat/index.html").read_text(encoding="utf-8")
    html = html.replace("n:1284", "n:128400")
    html = html.replace("requests in the test run",
                        "requests completed during the synthetic single-worker test run")
    if portrait:
        html = html.replace("width:1920px;height:1080px", "width:1080px;height:1920px")
        html = html.replace("left:200px;width:1520px", "left:90px;width:900px")
        html = html.replace("220px/1", "180px/1")
        html = html.replace("top:250px", "top:420px").replace("top:520px", "top:730px").replace("top:650px", "top:1100px")
    return html


def grade(landscape, portrait):
    with tempfile.TemporaryDirectory(prefix="motionbench-revision-control-") as temp:
        ws = Path(temp) / "ws"
        prepare(ws)
        (ws / "index.html").write_text(landscape, encoding="utf-8")
        (ws / "portrait.html").write_text(portrait, encoding="utf-8")
        result = Path(temp) / "result.json"
        completed = subprocess.run(["node", str(ROOT / "experiments/revision-stat/evaluate.mjs"),
                                    str(ws), str(result)], capture_output=True,
                                   text=True, encoding="utf-8", timeout=120)
        if completed.returncode not in [0, 1] or not result.exists():
            raise RuntimeError(completed.stderr)
        return json.loads(result.read_text(encoding="utf-8"))


def nested_stage(height=1920, *, unrelated_full_frame=False):
    html = reference(True).replace("html,body{margin:0;width:1080px;height:1920px;overflow:hidden;",
                                   "html,body{margin:0;overflow:hidden;")
    html = html.replace("<body>", '<body><div id="wrapper"><div id="stage" style="position:absolute;left:0;top:0;'
                        f'width:1080px;height:{height}px;overflow:hidden">')
    extra = ('<div style="position:fixed;left:0;top:0;width:1080px;height:1920px"></div>'
             if unrelated_full_frame else '')
    return html.replace("<script src", "</div></div>" + extra + "<script src", 1)


class RevisionRender(unittest.TestCase):
    def test_explicitly_sized_html_stage_passes(self):
        portrait = reference(True).replace("html,body{margin:0;width:1080px;height:1920px;overflow:hidden;",
            "html{width:1080px;height:1920px}body{margin:0;overflow:hidden;")
        result = grade(reference(), portrait)
        self.assertTrue(result["pass"], result)

    def test_animated_non_role_overflow_fails(self):
        portrait = reference(True).replace("overflow:hidden;", "overflow:visible;")
        portrait = portrait.replace("<script src", '<div id="decoration" style="position:absolute;left:0;top:0;width:40px;height:40px"></div><script src', 1)
        portrait = portrait.replace("tl.set({}, {}, 6);", "tl.set('#decoration',{x:1200},3);tl.set({}, {}, 6);")
        result = grade(reference(), portrait)
        check = next(c for c in result["formats"][1]["checks"] if "stage matches" in c["id"])
        self.assertFalse(check["pass"])
        self.assertGreater(check["got"]["scrollWidth"], 1080)

    def test_nested_absolutely_positioned_portrait_stage_passes(self):
        result = grade(reference(), nested_stage())
        self.assertTrue(result["pass"], result)

    def test_nested_undersized_portrait_stage_fails(self):
        result = grade(reference(), nested_stage(1400))
        check = next(c for c in result["formats"][1]["checks"] if "stage matches" in c["id"])
        self.assertFalse(check["pass"])

    def test_unrelated_full_frame_does_not_hide_an_undersized_stage(self):
        result = grade(reference(), nested_stage(1400, unrelated_full_frame=True))
        check = next(c for c in result["formats"][1]["checks"] if "stage matches" in c["id"])
        self.assertFalse(check["pass"])

    def test_reference_both_formats(self):
        result = grade(reference(), reference(True))
        self.assertTrue(result["pass"], result)

    def test_naive_landscape_layout_does_not_fit_portrait(self):
        result = grade(reference(), reference())
        self.assertTrue(result["formats"][0]["pass"])
        self.assertFalse(result["formats"][1]["pass"])

    def test_retiming_and_dropped_qualifier_fail(self):
        portrait = reference(True).replace("duration:2.0", "duration:1.5")
        portrait = portrait.replace("requests completed during the synthetic single-worker test run", "requests")
        result = grade(reference(), portrait)
        self.assertTrue(result["formats"][0]["pass"])
        failed = [c["id"] for c in result["formats"][1]["checks"] if not c["pass"]]
        self.assertTrue(any("spoken cue" in name for name in failed), failed)
        self.assertTrue(any("qualifier stays" in name for name in failed), failed)

    def test_clipped_long_qualifier_fails(self):
        portrait = reference(True).replace('</style>',
                     '[data-role="qualifier"]{height:50px;overflow:hidden}</style>')
        result = grade(reference(), portrait)
        self.assertTrue(result["formats"][0]["pass"])
        check = next(c for c in result["formats"][1]["checks"] if "qualifier stays" in c["id"])
        self.assertFalse(check["pass"])

    def test_starting_reveal_on_cue_is_not_arrival(self):
        portrait = reference(True).replace('tl.set({}, {}, 6);',
            "tl.fromTo('[data-role=source]',{opacity:0},{opacity:1,duration:0.42},2.5);tl.set({}, {}, 6);")
        result = grade(reference(), portrait)
        self.assertTrue(result["formats"][0]["pass"])
        check = next(c for c in result["formats"][1]["checks"] if "source stays" in c["id"])
        self.assertFalse(check["pass"])

    def test_source_below_portrait_editorial_safe_area_fails(self):
        portrait = reference(True).replace('top:1100px', 'top:1700px')
        result = grade(reference(), portrait)
        self.assertTrue(result["formats"][0]["pass"])
        check = next(c for c in result["formats"][1]["checks"] if "source stays" in c["id"])
        self.assertFalse(check["pass"])

    def test_absolutely_positioned_portrait_stage_passes(self):
        portrait = reference(True).replace("html,body{margin:0;width:1080px;height:1920px;overflow:hidden;",
                                           "html,body{margin:0;overflow:hidden;")
        portrait = portrait.replace("<body>", '<body><div id="stage" style="position:absolute;left:0;top:0;'
                                    'width:1080px;height:1920px;overflow:hidden">')
        portrait = portrait.replace("<script src", "</div><script src", 1)
        result = grade(reference(), portrait)
        self.assertTrue(result["pass"], result)

    def test_undersized_portrait_stage_fails(self):
        portrait = reference(True).replace("html,body{margin:0;width:1080px;height:1920px;overflow:hidden;",
                                           "html,body{margin:0;width:1080px;height:1400px;overflow:hidden;")
        result = grade(reference(), portrait)
        check = next(c for c in result["formats"][1]["checks"] if "stage matches" in c["id"])
        self.assertFalse(check["pass"])

    def test_final_value_vanishing_after_the_hold_fails(self):
        portrait = reference(True).replace("tl.set({}, {}, 6);",
                                           "tl.set('#value',{opacity:0},5.6);tl.set({}, {}, 6);")
        result = grade(reference(), portrait)
        self.assertTrue(result["formats"][0]["pass"])
        failed = [c["id"] for c in result["formats"][1]["checks"] if not c["pass"]]
        self.assertEqual(failed, ["revision: final value stays visible to the end of the timeline"])

    def test_line_break_reflow_reads_as_a_space(self):
        qualifier = "requests completed during the synthetic single-worker test run"
        for wrapped in ["requests completed during the<br>synthetic single-worker test run",
                        "requests completed during the <br>synthetic single-worker test run"]:
            result = grade(reference(), reference(True).replace(qualifier, wrapped))
            self.assertTrue(result["pass"], (wrapped, result))


if __name__ == "__main__":
    unittest.main(verbosity=2)
