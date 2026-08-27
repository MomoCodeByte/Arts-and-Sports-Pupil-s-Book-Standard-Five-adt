from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

PAGES = {
61: ("chapter-close-page", "Cleanliness of the working area", r'''
<figure class="lesson-figure pyramid-figure"><img src="images/pg061_im001.jpg" alt="Clay pots arranged in layers to form a pyramid."><figcaption><strong>Figure 14:</strong> Pots arranged in a pyramid format</figcaption></figure>
<h2 id="page-title">Cleanliness of the working area</h2>
<p>The area where work is done can be dirtied or destroyed. Therefore, it must be cleaned and reorganised properly. In clay modelling and firing tasks, the following activities should be done:</p>
<ol class="alpha-list" type="a"><li>Putting out the fire in the kiln;</li><li>Collecting ashes and burying them;</li><li>Cleaning leftovers and burying them; and</li><li>Filling up and levelling the holes from which clay soil was obtained and where the kiln was set.</li></ol>
<aside class="activity-panel"><img class="activity-icon" src="images/pg061_im002.jpg" alt=""><div class="panel-title">Activity 4</div><p>Visit any area in your community where the activity of modelling takes place, and then do the following:</p><ol class="alpha-list" type="a"><li>Observe how these objects are made.</li><li>Write about the objects you saw and how they are made.</li><li>Present your work to the class under the guidance of the teacher.</li></ol></aside>
<aside class="exercise-panel"><div class="panel-title">Exercise</div><ol class="number-list"><li>Explain the proper ways of storing pots made from clay in the community.</li><li>Describe how to use glaze in adding a shiny finish to clay objects.</li></ol></aside>
'''),
62: ("vocabulary-page", "Vocabulary", r'''
<h1 id="page-title">Vocabulary</h1>
<dl class="vocabulary-list"><dt>Glaze:</dt><dd>A type of mineral used to coat clay objects to give them a shiny appearance or to make them waterproof</dd><dt>Apron:</dt><dd>A garment worn over other clothes, tied at the waist or neck, to prevent getting dirty while working</dd><dt>Kiln:</dt><dd>A special oven built for baking bread, firing lime, bricks, or pottery items made from clay</dd><dt>Mould:</dt><dd>A container into which molten material is poured to achieve the desired shape</dd><dt>Plaster:</dt><dd>A mixture of cement and lime used in construction, which is applied to walls and floors to smooth out their surface</dd></dl>
'''),
63: ("chapter-five-page", "Chapter Five: Creating objects with simple shapes", r'''
<header><div class="chapter-banner">Chapter Five</div><h1 class="chapter-topic" id="page-title">Creating objects with simple shapes</h1></header>
<section class="intro-panel" aria-labelledby="intro-title"><h2 class="panel-title" id="intro-title">Introduction</h2><p>Making simple shapes using scraps of various materials is a simple art. This art can save the environment from pollution. It also provides us with art products that can be used in everyday life. In this chapter, you will learn how to use scraps of paper to make envelopes, bags and boxes. The competencies developed will enable you to create various items for home use and earn an income.</p></section>
<aside class="think-panel"><img class="think-icon" src="images/pg063_im001.jpg" alt=""><div class="panel-title">Think</div><p>How to use scrap materials to create objects with simple shapes</p></aside>
<h2>Making envelopes, bags and boxes using paper materials</h2><p>The use of paper is very important in everyday life. These papers, which can be hard or soft, are used for various purposes such as packaging or carriers. Making materials such as envelopes, bags, or boxes by using papers is a very important skill to learn.</p>
<h3>How to prepare papers for making envelopes, bags and boxes</h3><p>Making envelopes, bags and boxes for everyday use, such as packaging and carrying things, requires adequate preparation of the necessary materials, tools. This will help you avoid inconvenience while working and ensure that you achieve the best results. Some of the required materials and tools are:</p><ol class="craft-steps"><li>Clean papers of various colours and with appropriate thickness;</li><li>A ruler, pencil, large scissors, or trimming knives;</li></ol>
'''),
64: ("paper-craft-page page-64", "Making envelopes and bags", r'''
<ol class="craft-steps continued-list" start="3"><li>Hard paper such as manila, lightweight board, clips or pins, and a table;</li><li>Paper glue, light and heavy glue, and a brush;</li><li>Clean water, watercolours, and large boxes; and</li><li>Samples of envelopes, boxes, and bags of different sizes and shapes.</li></ol>
<h2 id="page-title">Making envelopes and bags</h2><p>Envelopes and bags can be made using scraps of various types of paper materials. These envelopes and bags can be in different shapes depending on their intended use. Figures 1 and 2 show examples of the different shapes of envelopes and bags.</p>
<figure class="lesson-figure envelope-shapes"><div class="diagram-row"><img src="images/pg064_im001.jpg" alt="A wide envelope with a pointed top flap and crossed folds on the front."><img src="images/pg064_im002.png" alt="A tall, narrow envelope with top and bottom flaps."><img src="images/pg064_im003.jpg" alt="A wide envelope with a rounded pointed flap and crossed folds on the front."></div><figcaption><strong>Figure 1:</strong> Envelopes of different shapes</figcaption></figure>
<figure class="lesson-figure bag-shapes"><div class="diagram-row"><img src="images/pg064_im004_seg001_v1.png" alt="A paper bag with folded sides and two cutout handles at the top."><img src="images/pg064_im004_seg002_v1.png" alt="A tall paper gift bag with string handles and a flap folded over the top."><img src="images/pg064_im004_seg003_v1.png" alt="A long, slim paper bag with folded sides and an open top."></div><figcaption><strong>Figure 2:</strong> Bags of different shapes</figcaption></figure>
<h3>Steps for making envelopes</h3><ol class="craft-steps"><li>Take various samples of envelopes and bags of different sizes;</li><li>Examine the parts joined with glue. Soften those parts with water;</li><li>After three to ten minutes, peel them apart. You will notice they come apart easily;</li><li>Add water where it seems difficult to peel. Never use force;</li><li>Unfold and stretch the bags or envelopes properly;</li><li>Spread them out and let them dry for a while.</li></ol>
'''),
65: ("paper-craft-page page-65", "Steps for making envelopes", r'''
<ol class="craft-steps" start="7"><li>Smooth them with a warm iron after drying. This will serve as a template for creating an envelope pattern. Figure 3 shows unfolded and folded templates;</li></ol>
<figure class="lesson-figure template-pair"><div class="diagram-row"><img src="images/pg065_im001.jpg" alt="Unfolded envelope template with pointed flaps on the top, bottom, left, and right."><img src="images/pg065_im002.png" alt="Partly folded envelope template, with the left side flap folded in toward the middle."></div><figcaption><strong>Figure 3:</strong> An example of a template for making an envelope</figcaption></figure>
<ol class="craft-steps" start="8"><li>Place the template on moderately thick paper;</li><li>Secure the template onto the thick paper using pins or clips;</li><li>Use a ruler and pencil to draw lines along the edges of the template;</li><li>Remove the pins or clips, and then separate the template from the thick paper;</li><li>Cut the paper using a trimming knife or pair of scissors, or blade. After these steps, the template for the envelope or bag is ready, as shown in Figure 4;</li></ol>
<figure class="lesson-figure template-numbered"><img src="images/pg065_im003.png" alt="Envelope template labelled with 1 at the top, 2 at the bottom, 3 on the left flap, and 4 on the right flap."><figcaption><strong>Figure 4:</strong> A rectangular envelope template</figcaption></figure>
<ol class="craft-steps" start="13"><li>Fold side number 3 inward. Fold it along the straight line between the corners of that side;</li><li>Fold side number 4 in the same way. Sides 3 and 4 will lie flat against each other as shown in Figure 5;</li></ol>
'''),
66: ("paper-craft-page page-66", "Folding an envelope", r'''
<figure class="lesson-figure fold-figure"><img src="images/pg066_im001.png" alt="Folded envelope shape with sides 3 and 4 crossed over in the middle."><figcaption><strong>Figure 5:</strong> Sides 3 and 4 of the folded envelope</figcaption></figure>
<ol class="craft-steps" start="15"><li>Fold side number 2 inward. Fold it until it lies on top of sides 3 and 4 as shown in Figure 6;</li></ol>
<figure class="lesson-figure fold-figure"><img src="images/pg066_im002.png" alt="Envelope diagram showing side 2 folded up under sides 3 and 4, with side 1 open at the top."><figcaption><strong>Figure 6:</strong> Side number 2 of the folded envelope</figcaption></figure>
<ol class="craft-steps" start="16"><li>Apply glue to all the parts of sides 2, 3, and 4 that will be joined. Then, join them together and press firmly as shown in Figure 7;</li></ol>
<figure class="lesson-figure fold-figure"><img src="images/pg066_im003.png" alt="Envelope diagram with sides 2, 3, and 4 joined together, and side 1 left open at the top."><figcaption><strong>Figure 7:</strong> Sides 2, 3, and 4 of the envelopes are joined together</figcaption></figure>
'''),
}

TEMPLATE = '''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Arts and Sports Pupil's Book Standard Five - page {n}</title><meta name="title-id" content="pg{nnn}_sec001"><meta name="page-section-id" content="{n}"><link href="./content/tailwind_output.css" rel="stylesheet"><link href="./assets/libs/fontawesome/css/all.min.css" rel="stylesheet"><link href="./assets/fonts.css" rel="stylesheet"><link href="./assets/book-pages.css?v=20260827-11" rel="stylesheet"></head><body><main><div id="content" class="opacity-0"><section role="article" aria-label="{label}" data-section-type="{section_type}" data-section-id="pg{nnn}_sec001" class="book-page content-page {classes}"><div class="page-inner">{content}</div>{hooks}</section></div></main><div class="page-voice-controls" aria-label="Page voice controls"><button type="button" data-page-read>Read page</button><button type="button" data-page-stop>Stop</button></div><div class="relative z-50" id="interface-container"></div><div class="relative z-50" id="nav-container"></div><script src="./assets/offline-preloader.js?v=audiofix-20260824-1"></script><script src="./assets/scorm.js"></script><script src="./assets/pdf-page-readalong.js?v=audiofix-20260824-1"></script><script src="./assets/base.bundle.local.js?v=audiofix-20260824-1"></script></body></html>'''

for n, (classes, label, content) in PAGES.items():
    path = ROOT / f"pg{n:03d}_sec001.html"
    old = path.read_text(encoding="utf-8")
    match = re.search(r'<div class="[^"]*semantic-page-text[^"]*"[^>]*>.*?</div>', old, re.S)
    if not match:
        raise RuntimeError(f"Narration hooks not found in {path.name}")
    hooks = re.sub(r'class="[^"]*semantic-page-text[^"]*"', 'class="page-narration-hooks semantic-page-text"', match.group(0), count=1).replace('aria-label="Accessible page text"', 'aria-hidden="true"')
    section_type = classes.split()[0].removesuffix("-page")
    rendered = TEMPLATE.format(n=n, nnn=f"{n:03d}", label=label, section_type=section_type, classes=classes, content=content.strip(), hooks=hooks)
    path.write_text(rendered + "\n", encoding="utf-8")
    print(f"rewrote {path.name}")
