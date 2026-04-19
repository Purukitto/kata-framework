---
"@kata-framework/core": patch
---

fix(parser): split adjacent `:: speaker ::` lines into separate text actions

When two or more `:: Speaker :: line` rows sat in the same paragraph (no
blank line between them, as markdown collapses them), the parser greedily
matched everything after the first `::` pair as one big content blob,
producing a single text action with the second speaker line embedded in
the content. The parser now walks each line of a `::`-leading paragraph
and emits one text action per speaker line, with non-speaker lines
treated as continuation content under the previous speaker.
