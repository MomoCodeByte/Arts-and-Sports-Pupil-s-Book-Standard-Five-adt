# Original PDF vs converted HTML - page fidelity audit

This audit compares all 112 physical PDF pages with the matching pg001-pg112 HTML files. Text metrics measure content presence and reading order; they do not prove pixel-perfect layout.

## Summary

- PDF physical pages: 112
- Converted HTML sections (including quizzes): 219
- PDF pages split into multiple HTML sections: 54
- Pages with missing referenced image files: 0
- CRITICAL: 5 pages
- MAJOR: 57 pages
- LAYOUT: 23 pages
- VISUAL: 27 pages

## Lowest content-similarity pages

| PDF page | HTML section(s) | F1 | Reading order | Finding |
|---:|---|---:|---:|---|
| 1 | index.html | 25.9% | 33.1% | Large text/content mismatch |
| 25 | pg025_sec001.html | 55.3% | 64.2% | Large text/content mismatch |
| 3 | pg003_sec001.html | 66.7% | 83.6% | Large text/content mismatch |
| 68 | pg068_sec001.html | 71.7% | 78.0% | Large text/content mismatch |
| 105 | pg105_sec001.html; pg105_sec002.html; pg105_sec003.html | 72.2% | 83.8% | Large text/content mismatch |
| 24 | pg024_sec001.html; pg024_sec002.html | 75.0% | 85.0% | Noticeable text/content mismatch |
| 23 | pg023_sec001.html | 78.5% | 85.3% | Noticeable text/content mismatch |
| 41 | pg041_sec001.html; pg041_sec002.html | 78.8% | 84.9% | Noticeable text/content mismatch |
| 69 | pg069_sec001.html | 79.8% | 84.4% | Noticeable text/content mismatch |
| 75 | pg075_sec001.html; pg075_sec002.html | 79.8% | 86.8% | Noticeable text/content mismatch |
| 38 | pg038_sec001.html | 80.4% | 89.6% | Noticeable text/content mismatch |
| 78 | pg078_sec001.html | 80.7% | 85.9% | Noticeable text/content mismatch |
| 55 | pg055_sec001.html | 81.1% | 88.0% | Noticeable text/content mismatch |
| 70 | pg070_sec001.html | 81.4% | 86.0% | Noticeable text/content mismatch |
| 111 | pg111_sec001.html; pg111_sec002.html | 81.6% | 87.8% | Noticeable text/content mismatch |
| 91 | pg091_sec001.html; pg091_sec002.html | 82.1% | 88.6% | Noticeable text/content mismatch |
| 84 | pg084_sec001.html; pg084_sec002.html; pg084_sec003.html; pg084_sec004.html | 83.3% | 91.1% | Noticeable text/content mismatch |
| 54 | pg054_sec001.html | 83.5% | 89.0% | Noticeable text/content mismatch |
| 66 | pg066_sec001.html | 83.6% | 86.7% | Noticeable text/content mismatch |
| 102 | pg102_sec001.html; pg102_sec002.html | 83.8% | 64.9% | Noticeable text/content mismatch |

## Interpretation

- CRITICAL/MAJOR means content differs, is missing, or is duplicated.
- LAYOUT means content is close but a single PDF page was divided into multiple HTML screens.
- VISUAL means text is close, but typography, spacing, colour, image crop, and exact placement still need rendered overlay comparison.
- The CSV contains one row for every physical page and is the working checklist for correction.
