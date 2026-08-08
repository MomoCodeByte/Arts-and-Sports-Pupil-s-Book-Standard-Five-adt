# Original PDF vs converted HTML - page fidelity audit

This audit compares all 112 physical PDF pages with the matching pg001-pg112 HTML files. Text metrics measure content presence and reading order; they do not prove pixel-perfect layout.

## Summary

- PDF physical pages: 112
- Converted HTML sections (including quizzes): 219
- PDF pages split into multiple HTML sections: 0
- Pages with missing referenced image files: 0
- CRITICAL: 9 pages
- MAJOR: 65 pages
- LAYOUT: 0 pages
- VISUAL: 38 pages

## Lowest content-similarity pages

| PDF page | HTML section(s) | F1 | Reading order | Finding |
|---:|---|---:|---:|---|
| 1 | index.html | 25.0% | 37.8% | Large text/content mismatch |
| 25 | pg025_sec001.html | 47.3% | 58.1% | Large text/content mismatch |
| 70 | pg070_sec001.html | 64.0% | 70.3% | Large text/content mismatch |
| 3 | pg003_sec001.html | 66.7% | 83.6% | Large text/content mismatch |
| 68 | pg068_sec001.html | 69.4% | 77.9% | Large text/content mismatch |
| 105 | pg105_sec001.html | 71.1% | 83.0% | Large text/content mismatch |
| 33 | pg033_sec001.html | 71.3% | 74.4% | Large text/content mismatch |
| 24 | pg024_sec001.html | 72.9% | 82.2% | Large text/content mismatch |
| 69 | pg069_sec001.html | 73.4% | 80.2% | Large text/content mismatch |
| 41 | pg041_sec001.html | 75.9% | 83.6% | Noticeable text/content mismatch |
| 23 | pg023_sec001.html | 76.5% | 83.9% | Noticeable text/content mismatch |
| 102 | pg102_sec001.html | 77.0% | 60.2% | Noticeable text/content mismatch |
| 78 | pg078_sec001.html | 77.1% | 83.1% | Noticeable text/content mismatch |
| 66 | pg066_sec001.html | 78.9% | 83.0% | Noticeable text/content mismatch |
| 92 | pg092_sec001.html | 78.9% | 85.8% | Noticeable text/content mismatch |
| 38 | pg038_sec001.html | 78.9% | 88.8% | Noticeable text/content mismatch |
| 55 | pg055_sec001.html | 79.4% | 86.5% | Noticeable text/content mismatch |
| 89 | pg089_sec001.html | 79.5% | 84.9% | Noticeable text/content mismatch |
| 75 | pg075_sec001.html | 79.8% | 86.8% | Noticeable text/content mismatch |
| 84 | pg084_sec001.html | 81.1% | 88.7% | Noticeable text/content mismatch |

## Interpretation

- CRITICAL/MAJOR means content differs, is missing, or is duplicated.
- LAYOUT means content is close but a single PDF page was divided into multiple HTML screens.
- VISUAL means text is close, but typography, spacing, colour, image crop, and exact placement still need rendered overlay comparison.
- The CSV contains one row for every physical page and is the working checklist for correction.
