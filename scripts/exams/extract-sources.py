#!/usr/bin/env python3
"""
Deterministic extractor for JLPT N4 exam prep datasets:
  - Official Past JLPT N4 (2025-12, 2025-07) from onjlpt.com
  - Vô Diện JP 12/2026 Mock Tests (#18 and #16) from Google Drive PDFs
Outputs clean intermediate JSON files in tmp/exam-raw/ for solution authoring.
"""

from __future__ import annotations

import html as html_lib
import json
import os
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

import fitz

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "tmp" / "exam-raw"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def http_get_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", errors="replace")


def http_get_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=45).read()


# ---------------------------------------------------------------------------
# HTML -> clean structured passages & text (preserving ONLY <u>...</u>)
# ---------------------------------------------------------------------------

def clean_inline_html(raw: str) -> str:
    if not raw:
        return ""
    s = raw.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n")
    # Convert cloze span markers like <span ...>18</span> -> [18]
    s = re.sub(r"<span[^>]*>\s*([0-9０-９]{1,2})\s*</span>", r"[\1]", s)
    # Keep <u> and </u>, strip other tags
    s = re.sub(r"<(?!/?u\b)[^>]+>", "", s)
    s = html_lib.unescape(s)
    # Normalize full-width spaces slightly while keeping Japanese spacing readable
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


class FlyerParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.blocks: list[str] = []
        self.tables: list[dict[str, Any]] = []
        self._in_table = False
        self._in_tr = False
        self._in_cell = False
        self._cell_is_th = False
        self._cell_rowspan = 1
        self._cell_colspan = 1
        self._cell_buf: list[str] = []
        self._current_rows: list[list[dict[str, Any]]] = []
        self._current_row: list[dict[str, Any]] = []
        self._block_buf: list[str] = []
        self._in_p = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        if tag == "table":
            self._flush_block()
            self._in_table = True
            self._current_rows = []
        elif self._in_table and tag == "tr":
            self._in_tr = True
            self._current_row = []
        elif self._in_table and tag in ("th", "td"):
            self._in_cell = True
            self._cell_is_th = tag == "th"
            self._cell_rowspan = int(attr_map.get("rowspan") or 1)
            self._cell_colspan = int(attr_map.get("colspan") or 1)
            self._cell_buf = []
        elif tag == "br":
            if self._in_cell:
                self._cell_buf.append("\n")
            else:
                self._block_buf.append("\n")
        elif tag == "u":
            if self._in_cell:
                self._cell_buf.append("<u>")
            else:
                self._block_buf.append("<u>")
        elif not self._in_table and tag in ("p", "li"):
            self._flush_block()
            self._in_p = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "u":
            if self._in_cell:
                self._cell_buf.append("</u>")
            else:
                self._block_buf.append("</u>")
        elif self._in_table and tag in ("th", "td"):
            text = re.sub(r"[ \t]+", " ", "".join(self._cell_buf)).strip()
            self._current_row.append({
                "text": text,
                "is_th": self._cell_is_th,
                "rowspan": self._cell_rowspan,
                "colspan": self._cell_colspan,
            })
            self._in_cell = False
        elif self._in_table and tag == "tr":
            if self._current_row:
                self._current_rows.append(self._current_row)
            self._in_tr = False
        elif tag == "table":
            self.tables.append(self._normalize_table(self._current_rows))
            self._in_table = False
        elif not self._in_table and tag in ("p", "li"):
            self._flush_block()
            self._in_p = False

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._cell_buf.append(data)
        else:
            self._block_buf.append(data)

    def _flush_block(self) -> None:
        txt = "".join(self._block_buf).strip()
        self._block_buf = []
        if txt:
            for line in txt.splitlines():
                line = line.strip()
                if line:
                    self.blocks.append(line)

    @staticmethod
    def _normalize_table(raw_rows: list[list[dict[str, Any]]]) -> dict[str, Any]:
        # Expand rowspan / colspan into a flat rectangular grid
        grid: list[list[str | None]] = []
        header_row_count = 0
        for r_idx, row in enumerate(raw_rows):
            while len(grid) <= r_idx:
                grid.append([])
            if all(c["is_th"] for c in row) and r_idx == header_row_count:
                header_row_count += 1
            col = 0
            for cell in row:
                while col < len(grid[r_idx]) and grid[r_idx][col] is not None:
                    col += 1
                for dr in range(cell["rowspan"]):
                    while len(grid) <= r_idx + dr:
                        grid.append([])
                    for dc in range(cell["colspan"]):
                        while len(grid[r_idx + dr]) <= col + dc:
                            grid[r_idx + dr].append(None)
                        grid[r_idx + dr][col + dc] = cell["text"]
                col += cell["colspan"]
        max_cols = max((len(r) for r in grid), default=0)
        norm = [[(r[c] if c < len(r) and r[c] is not None else "") for c in range(max_cols)] for r in grid]
        headers = norm[0] if header_row_count >= 1 and norm else []
        rows = norm[1:] if headers else norm
        return {"headers": headers, "rows": rows}

    def finish(self) -> tuple[list[str], list[dict[str, Any]]]:
        self._flush_block()
        return self.blocks, self.tables


class PassageParagraphParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.paragraphs: list[str] = []
        self._buf: list[str] = []
        self._in_span_blank = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = dict(attrs)
        if tag == "p":
            self._flush()
        elif tag == "br":
            self._buf.append("\n")
        elif tag == "u":
            self._buf.append("<u>")
        elif tag == "span" and "border" in (attr_map.get("style") or ""):
            self._in_span_blank = True
            self._buf.append("[")

    def handle_endtag(self, tag: str) -> None:
        if tag == "p":
            self._flush()
        elif tag == "u":
            self._buf.append("</u>")
        elif tag == "span" and self._in_span_blank:
            self._buf.append("]")
            self._in_span_blank = False

    def handle_data(self, data: str) -> None:
        self._buf.append(data)

    def _flush(self) -> None:
        s = "".join(self._buf)
        self._buf = []
        s = html_lib.unescape(s)
        s = re.sub(r"[ \t]+", " ", s).strip()
        if s:
            for sub in s.splitlines():
                sub = sub.strip()
                if sub:
                    self.paragraphs.append(sub)

    def finish(self) -> list[str]:
        self._flush()
        return self.paragraphs


# ---------------------------------------------------------------------------
# onjlpt.com RSC Extractor
# ---------------------------------------------------------------------------

def parse_onjlpt_section(ym: str, section: str) -> dict[str, Any]:
    url = f"https://onjlpt.com/n4/{ym}/{section}"
    html = http_get_text(url)
    chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', html, re.S)
    joined = ""
    for c in chunks:
        try:
            joined += json.loads('"' + c + '"')
        except Exception:
            pass
    refs: dict[str, str] = {}
    joined_bytes = joined.encode("utf-8")
    for m in re.finditer(rb"(?:^|\n|[\]\}])([0-9a-f]+):T([0-9a-f]+),", joined_bytes):
        ref_id = m.group(1).decode("ascii")
        byte_len = int(m.group(2).decode("ascii"), 16)
        start = m.end()
        refs["$" + ref_id] = joined_bytes[start : start + byte_len].decode("utf-8", errors="replace")

    q_idx = joined.find('"questions":{')
    m_start = joined.rfind('":[{"id":', 0, q_idx)
    dec = json.JSONDecoder()
    mondais, _ = dec.raw_decode(joined, m_start + 2)
    questions, _ = dec.raw_decode(joined, q_idx + len('"questions":'))
    rp_idx = joined.find('"readingPassages":{')
    rp = dec.raw_decode(joined, rp_idx + len('"readingPassages":'))[0] if rp_idx != -1 else {}
    sc_idx = joined.find('"supplementaryContent":{')
    sc = dec.raw_decode(joined, sc_idx + len('"supplementaryContent":'))[0] if sc_idx != -1 else {}
    return {
        "mondais": mondais,
        "questions": questions,
        "readingPassages": rp,
        "supplementaryContent": sc,
        "refs": refs,
    }


def split_listening_dialogue(mondai: dict[str, Any], q_count: int) -> list[list[dict[str, str]]]:
    tr = (mondai.get("transcript") or {}).get("transcript") or []
    # Find markers 1番 .. N番
    buckets: list[list[dict[str, str]]] = [[] for _ in range(q_count)]
    current_q = -1
    for seg in tr:
        txt = (seg.get("text") or "").strip()
        vi = (seg.get("text_vi") or "").strip()
        speaker = (seg.get("speaker") or "話者").strip()
        if not txt:
            continue
        m = re.match(r"^([1-9])番\b(.*)$", txt)
        if m:
            num = int(m.group(1))
            if 1 <= num <= q_count:
                current_q = num - 1
                # Keep the line (e.g. Mondai 3 has prompt right inside `1番。電車で...`)
                buckets[current_q].append({"speaker": speaker, "jp": txt, "vi": vi})
                continue
        if current_q >= 0:
            # Stop trailing end-of-mondai announcements if any
            if re.match(r"^これで問題\s*[1-4１-４]\s*を終わります", txt):
                continue
            buckets[current_q].append({"speaker": speaker, "jp": txt, "vi": vi})
    return buckets


def extract_onjlpt_exam(ym: str) -> dict[str, Any]:
    vocab_raw = parse_onjlpt_section(ym, "vocabulary")
    gr_raw = parse_onjlpt_section(ym, "grammar_reading")
    list_raw = parse_onjlpt_section(ym, "listening")

    sections: dict[str, list[dict[str, Any]]] = {
        "vocab": [],
        "grammar": [],
        "reading": [],
        "listening": [],
    }

    # Vocab
    for idx, m in enumerate(vocab_raw["mondais"], 1):
        mid = str(m["id"])
        qs = vocab_raw["questions"].get(mid, [])
        fmt_map = {
            "kanji_reading": "kanji_reading",
            "orthography": "kanji_writing",
            "context": "context",
            "paraphrase": "paraphrase",
            "usage": "usage",
        }
        sections["vocab"].append({
            "mondaiNumber": idx,
            "format": fmt_map.get(m.get("format", ""), m.get("format", "")),
            "instructionJa": re.sub(r"\s+", " ", m["title"]).strip(),
            "passages": [],
            "questions": [
                {
                    "number": int(re.match(r"^(\d+)\.", q["question_text"]).group(1)) if re.match(r"^(\d+)\.", q["question_text"]) else qi + 1,
                    "promptJa": re.sub(r"^\d+\.\s*", "", clean_inline_html(q["question_text"])),
                    "choices": [re.sub(r"^\d+\.\s*", "", clean_inline_html(c)) for c in q["choices"]],
                    "answerIndex": q["correct_answer_index"],
                }
                for qi, q in enumerate(qs)
            ],
        })

    # Grammar & Reading
    for m in gr_raw["mondais"]:
        mid = str(m["id"])
        qs = gr_raw["questions"].get(mid, [])
        fmt = m.get("format") or ""
        if fmt in ("grammar_form", "sentence_composition", "text_grammar"):
            sec_key = "grammar"
            fmt_out = {
                "grammar_form": "grammar_form",
                "sentence_composition": "star_order",
                "text_grammar": "cloze",
            }[fmt]
            m_num = len(sections["grammar"]) + 1
        else:
            sec_key = "reading"
            fmt_out = {
                "reading_short": "reading_short",
                "reading_medium": "reading_medium",
                "info_retrieval": "info_retrieval",
            }.get(fmt, fmt)
            m_num = len(sections["reading"]) + 1

        passages: list[dict[str, Any]] = []
        raw_passages = gr_raw["readingPassages"].get(mid, [])
        raw_supp = gr_raw["supplementaryContent"].get(mid, [])
        # Build question-id -> passage-id mapping for readingPassages
        q_to_passage: dict[int, str] = {}
        for pi, p in enumerate(raw_passages):
            pid = f"{ym}-m{mid}-p{pi+1}"
            content_html = gr_raw["refs"].get(p["content"], p["content"] or "")
            parser = PassageParagraphParser()
            parser.feed(content_html)
            paragraphs = parser.finish()
            passages.append({
                "id": pid,
                "paragraphs": paragraphs,
                "table": None,
                "notes": [],
            })
            if p.get("display_above_question_id"):
                q_to_passage[p["display_above_question_id"]] = pid

        for si, s in enumerate(raw_supp):
            pid = f"{ym}-m{mid}-s{si+1}"
            content_html = gr_raw["refs"].get(s["content"], s["content"] or "")
            fp = FlyerParser()
            fp.feed(content_html)
            blocks, tables = fp.finish()
            passages.append({
                "id": pid,
                "paragraphs": blocks,
                "tables": tables,
            })

        out_qs = []
        current_pid = passages[0]["id"] if passages else None
        for qi, q in enumerate(qs):
            if q["id"] in q_to_passage:
                current_pid = q_to_passage[q["id"]]
            prompt = clean_inline_html(q["question_text"])
            # Strip leading `14. ` or bare `18` for cloze
            m_num_prefix = re.match(r"^(\d+)\.\s*(.*)$", prompt, re.S)
            if m_num_prefix:
                q_no = int(m_num_prefix.group(1))
                prompt = m_num_prefix.group(2).strip()
            elif re.fullmatch(r"\d+", prompt.strip()):
                q_no = int(prompt.strip())
                prompt = f"（{q_no}）"
            else:
                q_no = qi + 1
            out_qs.append({
                "number": q_no,
                "promptJa": prompt,
                "choices": [re.sub(r"^\d+\.\s*", "", clean_inline_html(c)) for c in q["choices"]],
                "answerIndex": q["correct_answer_index"],
                "passageId": current_pid,
            })

        sections[sec_key].append({
            "mondaiNumber": m_num,
            "format": fmt_out,
            "instructionJa": re.sub(r"\s+", " ", m["title"]).strip(),
            "passages": passages,
            "questions": out_qs,
        })

    # Listening
    for idx, m in enumerate(list_raw["mondais"], 1):
        mid = str(m["id"])
        qs = list_raw["questions"].get(mid, [])
        dialogues = split_listening_dialogue(m, len(qs))
        fmt_out = m.get("format") or ""
        out_qs = []
        for qi, q in enumerate(qs):
            out_qs.append({
                "number": qi + 1,
                "promptJa": q["question_text"],
                "choices": [re.sub(r"^\d+\.\s*", "", clean_inline_html(c)) for c in q["choices"]],
                "answerIndex": q["correct_answer_index"],
                "hadImageInOriginal": bool(q.get("image_url")),
                "dialogue": dialogues[qi],
            })
        sections["listening"].append({
            "mondaiNumber": idx,
            "format": fmt_out,
            "instructionJa": re.sub(r"\s+", " ", m["title"]).strip(),
            "passages": [],
            "questions": out_qs,
        })

    return {"source": f"onjlpt:{ym}", "sections": sections}


# ---------------------------------------------------------------------------
# Vô Diện JP PDF Extractor (exact underline geometry + ruby span removal)
# ---------------------------------------------------------------------------

BOILERPLATE_SUBSTRINGS = (
    "TRUNG TÂM TIẾNG NHẬT",
    "ĐỀ MINH HOẠ SỐ",
    "ĐỀ MINH HỌA SỐ",
    "Lịch live chữa đề",
    "Nhận tài liệu miễn phí",
    "Xem lại live trên",
    "ĐỀ JLPT N4",
)


def extract_vdj_pdf(file_id: str, label: str) -> dict[str, Any]:
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    pdf_bytes = http_get_bytes(url)
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    rows_all: list[tuple[float, str]] = []  # (min_x0, text)
    for page in doc:
        underlines: list[fitz.Rect] = []
        for d in page.get_drawings():
            rect: fitz.Rect = d["rect"]
            fill = d.get("fill")
            color = d.get("color")
            is_black = (fill == (0.0, 0.0, 0.0)) or (color == (0.0, 0.0, 0.0))
            if is_black and rect.height < 3.0 and rect.width > 8.0 and 65 < rect.y0 < 730:
                underlines.append(rect)

        raw = page.get_text("rawdict")
        # Collect all main-text characters (size >= 11.2, y in 65..730)
        page_chars: list[tuple[float, float, str, bool]] = []  # (y_mid, x0, ch, is_ul)
        for block in raw.get("blocks", []):
            for line in block.get("lines", []):
                for sp in line.get("spans", []):
                    if sp["size"] < 11.2:
                        continue
                    for ch in sp.get("chars", []):
                        x0, y0, x1, y1 = ch["bbox"]
                        if y0 < 65 or y1 > 730:
                            continue
                        cx = (x0 + x1) / 2.0
                        ym = (y0 + y1) / 2.0
                        is_ul = any(
                            (r.x0 - 1.5 <= cx <= r.x1 + 1.5) and (-2.5 <= r.y0 - y1 <= 7.0)
                            for r in underlines
                        )
                        page_chars.append((ym, x0, ch["c"], is_ul))

        if not page_chars:
            continue

        # Cluster characters into visual rows (tolerance 7pt)
        page_chars.sort(key=lambda t: (t[0], t[1]))
        visual_rows: list[list[tuple[float, float, str, bool]]] = []
        for item in page_chars:
            if not visual_rows or abs(item[0] - visual_rows[-1][0][0]) > 7.5:
                visual_rows.append([item])
            else:
                visual_rows[-1].append(item)

        for r in visual_rows:
            r.sort(key=lambda t: t[1])
            min_x = min((t[1] for t in r if t[2].strip()), default=999.0)
            buf: list[str] = []
            in_ul = False
            prev_x: float | None = None
            for _, x0, c, is_ul in r:
                # Preserve visual separation when multiple choices share a row
                if prev_x is not None and x0 - prev_x > 28 and (not buf or buf[-1] != " "):
                    if in_ul:
                        buf.append("</u>")
                        in_ul = False
                    buf.append("   ")
                if is_ul and not in_ul:
                    if c.strip():
                        buf.append("<u>")
                        in_ul = True
                elif not is_ul and in_ul:
                    buf.append("</u>")
                    in_ul = False
                buf.append(c)
                prev_x = x0
            if in_ul:
                buf.append("</u>")
            text_line = "".join(buf)
            text_line = re.sub(r"<u>(\s+)</u>", r"\1", text_line)
            text_line = re.sub(r"<u>\s+", " <u>", text_line)
            text_line = re.sub(r"\s+</u>", "</u> ", text_line)
            text_line = re.sub(r"</u>(\s*)<u>", r"\1", text_line)
            text_line = text_line.strip()
            if not text_line:
                continue
            if any(b in text_line for b in BOILERPLATE_SUBSTRINGS):
                continue
            rows_all.append((min_x, text_line))

    # Split at standalone 文法 header
    bunpou_idx = next((i for i, (_, t) in enumerate(rows_all) if t == "文法"), None)
    if bunpou_idx is None:
        raise RuntimeError(f"Could not locate 文法 section in {label}")
    vocab_rows = rows_all[:bunpou_idx]
    grammar_rows = rows_all[bunpou_idx + 1 :]

    def split_mondais(rows: list[tuple[float, str]]) -> list[tuple[int, list[tuple[float, str]]]]:
        groups: list[tuple[int, list[tuple[float, str]]]] = []
        cur_num: int | None = None
        cur_rows: list[tuple[float, str]] = []
        for x0, txt in rows:
            m = re.match(r"^(?:もんだい|問題)\s*([1-5１-５])[:：\s]*(.*)$", txt)
            if m:
                if cur_num is not None:
                    groups.append((cur_num, cur_rows))
                cur_num = int(m.group(1).translate(str.maketrans("１２３４５", "12345")))
                cur_rows = []
                rest = m.group(2).strip()
                if rest:
                    cur_rows.append((x0, rest))
            elif cur_num is not None:
                cur_rows.append((x0, txt))
        if cur_num is not None:
            groups.append((cur_num, cur_rows))
        return groups

    def parse_numbered_questions(
        rows: list[tuple[float, str]], start_num: int, is_cloze: bool = False
    ) -> tuple[str, list[str], list[dict[str, Any]], int]:
        instr_parts: list[str] = []
        i = 0
        while i < len(rows):
            x0, l = rows[i]
            if is_cloze:
                if (
                    x0 < 120
                    and not l.startswith(("文章", "下", "21 から", "21から"))
                    and ("入れますか" not in l and "えらんで" not in l and "ください" not in l or "「" in l)
                    and len(instr_parts) > 0
                ):
                    break
                if l.startswith(("「", "下")):
                    if l.startswith("下"):
                        instr_parts.append(l)
                        i += 1
                    break
                instr_parts.append(l)
                i += 1
            else:
                if x0 < 95 and re.match(rf"^{start_num}\.\s*", l) and not l.startswith(("1・", "１・")):
                    break
                instr_parts.append(l)
                i += 1

        instr = re.sub(r"\s+", " ", " ".join(instr_parts)).strip()
        rest_rows = rows[i:]

        passage_lines: list[str] = []
        if is_cloze:
            q_start_idx = len(rest_rows)
            for idx, (_, l) in enumerate(rest_rows):
                if re.fullmatch(r"2[1-5]", l):
                    q_start_idx = idx
                    break
            raw_p_lines = rest_rows[:q_start_idx]
            joined_p = ""
            for px, pl in raw_p_lines:
                clean_pl = re.sub(r"<u>(2[1-5])</u>", r"[\1]", pl)
                clean_pl = re.sub(r"\s+(2[1-5])\s+", r" [\1] ", f" {clean_pl} ").strip()
                clean_pl = re.sub(r"\s{2,}", " ", clean_pl)
                if clean_pl.startswith("ださい。"):
                    clean_pl = clean_pl[len("ださい。") :].strip()
                if not clean_pl:
                    continue
                if clean_pl.startswith("「") or px > 300:
                    if joined_p:
                        passage_lines.append(joined_p)
                        joined_p = ""
                    passage_lines.append(clean_pl)
                else:
                    joined_p = (joined_p + clean_pl) if joined_p else clean_pl
            if joined_p:
                passage_lines.append(joined_p)
            rest_rows = rest_rows[q_start_idx:]

        q_items: list[dict[str, Any]] = []
        cur_num: int | None = None
        expected_next = start_num
        cur_chunks: list[str] = []
        for x0, l in rest_rows:
            if is_cloze and re.fullmatch(r"(2[1-5])", l):
                cand_n = int(l)
                if cur_num is not None:
                    q_items.append({"num": cur_num, "raw": "\n".join(cur_chunks)})
                cur_num = cand_n
                expected_next = cand_n + 1
                cur_chunks = []
                continue
            m_q = re.match(r"^(\d{1,2})\.\s*(.*)$", l)
            if not is_cloze and m_q and x0 < 95:
                cand_n = int(m_q.group(1))
                # Only advance when the number matches the sequential question number
                # AND (either it's >= 5 so it can't be a 1..4 choice, or no choice `1.` has appeared yet on Q1..Q4, OR `4.` already appeared).
                raw_so_far = "\n".join(cur_chunks)
                finished_choices = cur_num is None or bool(re.search(r"(?:^|\s)4\.\s+", raw_so_far))
                if cand_n == expected_next and (cand_n >= 5 or finished_choices):
                    if cur_num is not None:
                        q_items.append({"num": cur_num, "raw": raw_so_far})
                    cur_num = cand_n
                    expected_next = cand_n + 1
                    cur_chunks = [m_q.group(2)] if m_q.group(2) else []
                    continue
            if cur_num is not None:
                cur_chunks.append(l)
        if cur_num is not None:
            q_items.append({"num": cur_num, "raw": "\n".join(cur_chunks)})

        parsed_qs = []
        for item in q_items:
            raw_q = item["raw"]
            m_c1 = re.search(r"(?:^|\s)1\.\s+", raw_q)
            if not m_c1:
                parsed_qs.append({"number": item["num"], "promptJa": raw_q, "choices": [], "raw_error": "no choices"})
                continue
            prompt = raw_q[: m_c1.start()].replace("\n", " ").strip()
            prompt = re.sub(r"\s{2,}", " ", prompt)
            choices_str = raw_q[m_c1.start() :].strip()
            c_parts = re.split(r"(?:^|\s)[1-4]\.\s+", " " + choices_str)
            choices = [re.sub(r"\s+", " ", cp).strip() for cp in c_parts if cp.strip()]
            parsed_qs.append({
                "number": item["num"],
                "promptJa": prompt,
                "choices": choices,
            })
        return instr, passage_lines, parsed_qs, expected_next

    vocab_formats = {
        1: "kanji_reading",
        2: "kanji_writing",
        3: "context",
        4: "paraphrase",
        5: "usage",
    }
    vocab_mondais = []
    next_v = 1
    for m_num, m_rows in split_mondais(vocab_rows):
        instr, _, qs, next_v = parse_numbered_questions(m_rows, next_v, is_cloze=False)
        vocab_mondais.append({
            "mondaiNumber": m_num,
            "format": vocab_formats.get(m_num, "unknown"),
            "instructionJa": instr,
            "passages": [],
            "questions": qs,
        })

    grammar_formats = {1: "grammar_form", 2: "star_order", 3: "cloze"}
    grammar_mondais = []
    next_g = 1
    for m_num, m_rows in split_mondais(grammar_rows):
        instr, p_lines, qs, next_g = parse_numbered_questions(m_rows, next_g, is_cloze=(m_num == 3))
        passages = []
        if p_lines:
            passages.append({
                "id": f"{label}-cloze",
                "paragraphs": p_lines,
                "table": None,
            })
            for q in qs:
                q["passageId"] = f"{label}-cloze"
                if not q["promptJa"]:
                    q["promptJa"] = f"（{q['number']}）"
        grammar_mondais.append({
            "mondaiNumber": m_num,
            "format": grammar_formats.get(m_num, "unknown"),
            "instructionJa": instr,
            "passages": passages,
            "questions": qs,
        })

    return {
        "source": f"gdrive:{file_id}",
        "sections": {
            "vocab": vocab_mondais,
            "grammar": grammar_mondais,
        },
    }


def main() -> None:
    targets = [
        ("jlpt-2025-12.json", lambda: extract_onjlpt_exam("202512")),
        ("jlpt-2025-07.json", lambda: extract_onjlpt_exam("202507")),
        ("vdj-2026-18.json", lambda: extract_vdj_pdf("1AzVoQq4lbYsupowYv03Zaw7dLBHOUG-r", "vdj-2026-18")),
        ("vdj-2026-16.json", lambda: extract_vdj_pdf("1brq8RXVSRDthHM0iYCknOGlqYwsB12B6", "vdj-2026-16")),
    ]
    for fname, fn in targets:
        data = fn()
        out_path = OUT_DIR / fname
        out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        counts = {
            sec: sum(len(m["questions"]) for m in ms)
            for sec, ms in data["sections"].items()
        }
        print(f"Wrote {fname}: {counts} (total={sum(counts.values())})")
        # Sanity check VDJ choices length
        for sec, ms in data["sections"].items():
            for m in ms:
                for q in m["questions"]:
                    if len(q.get("choices", [])) not in (3, 4):
                        print(f"  WARNING {fname} {sec} M{m['mondaiNumber']} Q{q['number']}: choices={len(q.get('choices', []))}")


if __name__ == "__main__":
    main()
