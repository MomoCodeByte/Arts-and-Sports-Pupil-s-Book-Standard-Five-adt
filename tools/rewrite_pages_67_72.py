from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

PAGES = {
67: ("paper-making-page page-67", "Making paper bag envelopes", r'''
<ol class="craft-steps" start="17"><li>Apply envelope glue to the edge of the inner part of the envelope flap;</li><li>You can use the following method if there is no envelope glue:<ol type="i"><li>Take a strip of paper glue.</li><li>Apply water-based glue to the outer part of the strip.</li><li>Attach the part where you applied glue to the inner side of the envelope flap.</li></ol></li></ol>
<p>Ensure you maintain cleanliness in all steps to produce clean and attractive materials.</p>
<aside class="activity-panel"><img class="activity-icon" src="images/pg067_im001.jpg" alt=""><div class="panel-title">Activity 1</div><p>Create at least five envelopes of different types and sizes. Ensure the envelopes are clean and attractive.</p></aside>
<h2 id="page-title">Steps for making paper bag envelopes</h2>
<ol class="craft-steps"><li>Cut a paper into a rectangular shape;</li></ol>
<figure class="lesson-figure rectangle-figure"><div class="paper-rectangle" role="img" aria-label="A piece of brown paper in a rectangular shape."></div><figcaption><strong>Figure 8:</strong> A piece of paper in a rectangular shape</figcaption></figure>
<ol class="craft-steps" start="2"><li>Fold the paper on the right and the left sides down to the middle until they overlap for about 1cm;</li></ol>
'''),
68: ("paper-making-page page-68", "Folding the sides of a paper bag", r'''
<figure class="lesson-figure tall-step-figure"><img src="images/pg068_im001.jpg" alt="Two sides of the paper fold inward to meet at the centre."><figcaption><strong>Figure 9:</strong> How to fold two sides</figcaption></figure>
<ol class="craft-steps" start="3"><li>Tape or glue the sides of the paper together;</li></ol>
<figure class="lesson-figure tall-step-figure"><img src="images/pg068_im002.png" alt="The two folded sides are glued together in the middle."><figcaption><strong>Figure 10:</strong> Two sides of paper joined with glue</figcaption></figure>
<ol class="craft-steps" start="4"><li>Fold the bottom part of the paper bag. Press it and unfold to leave the fold mark;</li></ol>
'''),
69: ("paper-making-page page-69", "Folding the bottom of a paper bag", r'''
<figure class="lesson-figure step-pair"><div class="diagram-row"><img src="images/pg069_im001.jpg" alt="Fold the bottom flap of the paper bag upward."><img src="images/pg069_im002.jpg" alt="Turn the folded bottom section upward on the right side."></div><figcaption><strong>Figure 11:</strong> How to fold the bottom part of the paper bag</figcaption></figure>
<ol class="craft-steps" start="5"><li>Open the bottom fold, flatten each corner to make a triangle shape, and press the paper;</li></ol>
<figure class="lesson-figure triangle-step"><img src="images/pg069_im003.jpg" alt="Open the bottom fold and press the corners flat to make two triangle shapes."><figcaption><strong>Figure 12:</strong> How to fold a paper bag in a triangular style</figcaption></figure>
<ol class="craft-steps" start="6"><li>Fold each side of the bottom towards the middle, so that they overlap for about 1 cm, then tape or glue them together.</li></ol>
'''),
70: ("paper-making-page page-70", "Making paper bags and boxes", r'''
<figure class="lesson-figure step-pair"><div class="diagram-row"><img src="images/pg070_im001.jpg" alt="Fold the middle bottom flap up to close the base of the paper bag."><img src="images/pg070_im002.jpg" alt="The bottom flaps meet in the middle to make a firm paper bag base."></div><figcaption><strong>Figure 13:</strong> How to secure the bottom parts of a paper bag</figcaption></figure>
<aside class="activity-panel"><img class="activity-icon" src="images/pg067_im001.jpg" alt=""><div class="panel-title">Activity 2</div><ol class="alpha-list" type="a"><li>Use a paper bag to create a template for the bag.</li><li>Use that template to make at least five bags.</li></ol></aside>
<h2 id="page-title">Steps for making boxes</h2><ol class="craft-steps"><li>Choose the box size you want to make and strip it carefully by following the joints. Figure 14 shows samples of boxes of different sizes;</li></ol>
<figure class="lesson-figure box-pair"><div class="diagram-row"><img src="images/pg070_im005.png" alt="A large box with a lid folded over the top."><img src="images/pg070_im004.jpg" alt="A tall, narrow box with an open top and a lid raised up."></div><figcaption><strong>Figure 14:</strong> Boxes of different sizes</figcaption></figure>
'''),
71: ("paper-making-page page-71", "Making boxes and baskets", r'''
<ol class="craft-steps" start="2"><li>Place it on a larger box material, and trace its outline;</li><li>Cut along the traced outline using a trimming knife or a pair of scissors.</li><li>Draw lines on the sections that will be folded, then fold them.</li><li>Assemble the box using water-based glue.</li></ol>
<p>Ensure you maintain cleanliness in all steps to get a neat and attractive box as shown in Figure 15.</p>
<figure class="lesson-figure open-box"><img src="images/pg071_im001.png" alt="An open paper box with four flaps folded outward at the top."><figcaption><strong>Figure 15:</strong> The shape of the ready-made paper box</figcaption></figure>
<aside class="activity-panel"><img class="activity-icon" src="images/pg071_im002.jpg" alt=""><div class="panel-title">Activity 3</div><p>Create at least three small boxes of different sizes and shapes.</p></aside>
<h2 id="page-title">Making baskets using scraps of various materials</h2><p>Basket making using various types of materials is a very important art for the community. The baskets that are made can be sold at the market for different uses. There are many types of materials, such as paper, sisal ropes, nylon threads, and raffia, that can be used to make baskets.</p>
'''),
72: ("paper-making-page page-72", "Making baskets using paper materials", r'''
<h3>Scraps of paper materials</h3><p>These are easy to find and are used to make baskets for carrying light items and for decoration. Figure 16 shows a basket made from scraps of paper material.</p>
<figure class="lesson-figure basket-figure"><img src="images/pg072_im001.jpg" alt="A small basket woven from green and yellow paper strips, with a handle and flower decorations."><figcaption><strong>Figure 16:</strong> A basket made from scraps of paper material</figcaption></figure>
<h2 id="page-title">Steps for making baskets using paper materials</h2>
<ol class="basket-steps" type="a"><li><strong>Prepare the paper material.</strong> Cut the paper into long strips about 1 to 2 centimetres wide. Use a pencil or a thin stick to roll each strip tightly to form a tube-like shape;</li><li><strong>Create the base of the basket.</strong> Take eight to ten paper tubes and arrange them in a star shape (intersecting at the centre). Use glue to stick them together at the centre, and wait for them to dry;</li><li><strong>Start weaving the basket wall.</strong> Take one paper tube and begin wrapping it around the base tubes. Weave by alternating the tube over and under the base tubes in sequence. Continue weaving in a circular motion, ensuring each layer is firm and close together;</li><li><strong>Increase the size of the basket.</strong> When you reach the end of a paper tube, glue on another one and continue weaving. Repeat this process until the basket wall reaches the desired height;</li><li><strong>Finalise the top of the basket.</strong> Trim the base tubes with scissors to match the basket’s height. Fold the ends inward and glue them down to create a neat rim; and</li><li><strong>Add decorations.</strong> Enhance the appearance of the basket by adding decorative cords or extra embellishments.</li></ol>
'''),
}

TEMPLATE = '''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Arts and Sports Pupil's Book Standard Five - page {n}</title><meta name="title-id" content="pg{nnn}_sec001"><meta name="page-section-id" content="{n}"><link href="./content/tailwind_output.css" rel="stylesheet"><link href="./assets/libs/fontawesome/css/all.min.css" rel="stylesheet"><link href="./assets/fonts.css" rel="stylesheet"><link href="./assets/book-pages.css?v=20260827-14" rel="stylesheet"></head><body><main><div id="content" class="opacity-0"><section role="article" aria-label="{label}" data-section-type="paper-making" data-section-id="pg{nnn}_sec001" class="book-page content-page {classes}"><div class="page-inner">{content}</div>{hooks}</section></div></main><div class="page-voice-controls" aria-label="Page voice controls"><button type="button" data-page-read>Read page</button><button type="button" data-page-stop>Stop</button></div><div class="relative z-50" id="interface-container"></div><div class="relative z-50" id="nav-container"></div><script src="./assets/offline-preloader.js?v=audiofix-20260824-1"></script><script src="./assets/scorm.js"></script><script src="./assets/pdf-page-readalong.js?v=audiofix-20260824-1"></script><script src="./assets/base.bundle.local.js?v=audiofix-20260824-1"></script></body></html>'''

for n, (classes, label, content) in PAGES.items():
    path = ROOT / f"pg{n:03d}_sec001.html"
    old = path.read_text(encoding="utf-8")
    match = re.search(r'<div class="[^"]*semantic-page-text[^"]*"[^>]*>.*?</div>', old, re.S)
    if not match:
        raise RuntimeError(f"Narration hooks not found in {path.name}")
    hooks = re.sub(r'class="[^"]*semantic-page-text[^"]*"', 'class="page-narration-hooks semantic-page-text"', match.group(0), count=1).replace('aria-label="Accessible page text"', 'aria-hidden="true"')
    rendered = TEMPLATE.format(n=n, nnn=f"{n:03d}", label=label, classes=classes, content=content.strip(), hooks=hooks)
    path.write_text(rendered + "\n", encoding="utf-8")
    print(f"rewrote {path.name}")
