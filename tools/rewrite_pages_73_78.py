from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

PAGES = {
73: ("basket-page page-73", "Baskets from sisal and nylon rope", r'''
<aside class="activity-panel"><img class="activity-icon" src="images/pg067_im001.jpg" alt=""><div class="panel-title">Activity 4</div><p>Make a small basket using scrap paper materials.</p></aside>
<h2 id="page-title">Nylon string or sisal rope scraps materials</h2><p>Sisal or nylon ropes are easy to weave and are used to make various types of durable baskets. Figures 17 and 18 show baskets made from sisal and nylon rope scraps.</p>
<div class="basket-pair"><figure class="lesson-figure"><img src="images/pg073_im002.jpg" alt="A small round basket woven from thick sisal rope, with a wide open top and strong sides."><figcaption><strong>Figure 17:</strong> Basket made from bundles of sisal ropes</figcaption></figure><figure class="lesson-figure"><img src="images/pg073_im003.jpg" alt="A red woven basket made from nylon rope, with two handles and a rectangular shape."><figcaption><strong>Figure 18:</strong> Basket made from bundles of nylon ropes</figcaption></figure></div>
<h3>Steps for making baskets using sisal or nylon ropes</h3><ol class="craft-steps"><li>Prepare the necessary materials such as sisal or nylon ropes, scissors, a large needle or a weaving tool;</li><li>Cut your ropes according to the size you want for the basket;</li><li>Create the base of the basket by winding the rope into a circular or rectangular shape to form the foundation;</li><li>Use the needle to sew the rope together in order to secure the turns of the base;</li><li>Build the walls of the basket by weaving the rope upwards from the base. Ensure the rope turns are tightly secured using the needle or weaving tool; and</li><li>Finalise the basket by tightening the final rounds for it to be strong.</li></ol>
'''),
74: ("basket-page page-74", "Benefits of creating simple shapes", r'''
<aside class="activity-panel"><img class="activity-icon" src="images/pg067_im001.jpg" alt=""><div class="panel-title">Activity 5</div><p>Make baskets using sisal rope materials.</p></aside>
<aside class="activity-panel"><img class="activity-icon" src="images/pg067_im001.jpg" alt=""><div class="panel-title">Activity 6</div><p>Use nylon rope materials to make a simple basket for storing grains.</p></aside>
<h2 id="page-title">Benefits of creating simple shapes</h2><p>The art of creating simple shapes such as envelopes, bags, and boxes has numerous benefits. Some of these benefits include:</p>
<ol class="benefit-list" type="i"><li><strong>Enhancing creativity.</strong> Creating envelopes, bags, and boxes requires innovative thinking to design different structures and styles, which helps develop unique and interesting ideas;</li><li><strong>Developing technical skills.</strong> This art involves skilful use of tools and materials for cutting, stitching, and folding something which helps to build technical expertise;</li><li><strong>Improving precision and accuracy.</strong> Creating simple shapes requires careful measurements and attention to instructions. This in turn cultivates doing work carefully;</li><li><strong>Building patience and perseverance.</strong> This activity requires time and patience, fostering the ability to endure challenges and work diligently;</li><li><strong>Promoting self-reliance.</strong> Creating simple shapes can enhance independence, as one can create their own tools instead of always purchasing them;</li><li><strong>Developing entrepreneurial skills.</strong> This art can be a source of income by selling handmade envelopes, bags, and boxes, especially if they have unique and attractive designs; and</li><li><strong>Environmental conservation.</strong> Creating simple shapes using recycled scraps of various materials, such as paper, contributes to raise awareness on the importance of preserving the environment</li></ol>
'''),
75: ("chapter-review-page page-75", "Chapter Five exercise and vocabulary", r'''
<aside class="exercise-panel"><div class="panel-title">Exercise</div><ol class="number-list"><li>List the steps you will follow when making an envelope by using a scrap of papers.</li><li>What benefits can you gain from engaging in the making of simple shapes using scraps of various materials available in your environment?</li></ol></aside>
<h1 id="page-title">Vocabulary</h1><dl class="vocabulary-list"><dt>Simple:</dt><dd>The state of something being easy or straightforward.</dd><dt>Template:</dt><dd>A drawing, diagram, or picture created for the purpose of making other items</dd></dl>
'''),
76: ("chapter-opener-page chapter-six-page", "Chapter Six: Physical exercises and traditional games", r'''
<header><div class="chapter-banner">Chapter Six</div><h1 class="chapter-topic" id="page-title">Physical exercises and traditional games</h1></header>
<section class="intro-panel" aria-labelledby="intro-title"><h2 class="panel-title" id="intro-title">Introduction</h2><p>Physical exercise and traditional games are important in everyday life. In this chapter, you will learn various physical exercises and traditional games. The competencies developed will enable you to do various physical exercises, as well as play traditional games.</p></section>
<aside class="think-panel"><img class="think-icon" src="images/pg076_im001.jpg" alt=""><div class="panel-title">Think</div><p>Exercises that can improve strength and speed</p></aside>
<h2>Physical exercises</h2><p>Physical exercises are very important in improving health and performance of the body in various physical activities. Performing these exercises skilfully and safely helps to improve the ability to perform well in sports and other physical activities. In this section, you will practice the exercises that improve strength and speed.</p>
<h2>Strength and speed exercises</h2><p>Strength and speed are important for players in various sports, including football and netball. Strength helps players compete physically, make powerful passes, and prevent injuries, while speed enables them to make quick moves into good positions and control opponents.</p>
'''),
77: ("exercise-method-page page-77", "Strength exercises and squats", r'''
<h1 id="page-title">Strength exercises</h1><p>Strength exercises provide different challenges to the muscles and other body systems. There are various physical exercises that help to build strength. These exercises include squats, high knees, push-ups and planks.</p>
<h2>(a) <strong>Squats</strong></h2><p>This exercise strengthens the legs and hip muscles. Therefore, it helps the players to be stable when competing with opponents.</p>
<h3>How to do squats:</h3><ol class="roman-steps" type="i"><li>Stand upright, legs slightly apart;</li><li>Slowly bend your knees while lowering your body as if sitting in a chair; and</li><li>Stand up again and repeat 10 to 15 times for 3 sets, by following steps (i-ii) as shown in Figure 1.</li></ol>
<figure class="lesson-figure exercise-figure"><img src="images/pg077_im001.jpg" alt="A boy shows two steps of a squat exercise: standing straight and bending down with his knees bent and hands together."><figcaption><strong>Figure 1:</strong> Doing the squat exercise</figcaption></figure>
'''),
78: ("exercise-method-page page-78", "High knees exercise", r'''
<aside class="activity-panel"><img class="activity-icon" src="images/pg078_im001_seg001_v1.png" alt=""><div class="panel-title">Activity 1</div><ol class="alpha-list" type="a"><li>Do a squat exercise individually.</li><li>In pairs, compete by doing as many sets of squats as possible.</li></ol></aside>
<h2 id="page-title">(b)&nbsp; <strong>High Knees</strong></h2><p>This exercise strengthens the legs and increases speed.</p><h3>How to do high knees:</h3><ol class="roman-steps" type="i"><li>Run while raising the knees towards your chest, as shown in Figure 2.</li><li>Do this exercise for 30 to 60 seconds 3 times.</li></ol>
<figure class="lesson-figure high-knees-figure"><div class="diagram-row"><img src="images/pg078_im002_seg001_v1.png" alt="A boy does high knees by standing on one leg and lifting the other knee up high."><img src="images/pg078_im002_seg002_v1.png" alt="A boy does high knees with one knee lifted toward his chest and his arms bent for running."></div><figcaption><strong>Figure 2:</strong> Doing the high knees exercise</figcaption></figure>
'''),
}

TEMPLATE = '''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Arts and Sports Pupil's Book Standard Five - page {n}</title><meta name="title-id" content="pg{nnn}_sec001"><meta name="page-section-id" content="{n}"><link href="./content/tailwind_output.css" rel="stylesheet"><link href="./assets/libs/fontawesome/css/all.min.css" rel="stylesheet"><link href="./assets/fonts.css" rel="stylesheet"><link href="./assets/book-pages.css?v=20260827-16" rel="stylesheet"></head><body><main><div id="content" class="opacity-0"><section role="article" aria-label="{label}" data-section-type="semantic-book-page" data-section-id="pg{nnn}_sec001" class="book-page content-page {classes}"><div class="page-inner">{content}</div>{hooks}</section></div></main><div class="page-voice-controls" aria-label="Page voice controls"><button type="button" data-page-read>Read page</button><button type="button" data-page-stop>Stop</button></div><div class="relative z-50" id="interface-container"></div><div class="relative z-50" id="nav-container"></div><script src="./assets/offline-preloader.js?v=audiofix-20260824-1"></script><script src="./assets/scorm.js"></script><script src="./assets/pdf-page-readalong.js?v=audiofix-20260824-1"></script><script src="./assets/base.bundle.local.js?v=audiofix-20260824-1"></script></body></html>'''

for n, (classes, label, content) in PAGES.items():
    path = ROOT / f"pg{n:03d}_sec001.html"
    old = path.read_text(encoding="utf-8")
    match = re.search(r'<div class="[^"]*semantic-page-text[^"]*"[^>]*>.*?</div>', old, re.S)
    if not match:
        raise RuntimeError(f"Narration hooks not found in {path.name}")
    hooks = re.sub(r'class="[^"]*semantic-page-text[^"]*"', 'class="page-narration-hooks semantic-page-text"', match.group(0), count=1).replace('aria-label="Accessible page text"', 'aria-hidden="true"')
    path.write_text(TEMPLATE.format(n=n, nnn=f"{n:03d}", label=label, classes=classes, content=content.strip(), hooks=hooks) + "\n", encoding="utf-8")
    print(f"rewrote {path.name}")
