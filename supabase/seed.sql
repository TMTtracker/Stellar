-- STELLAR Course System seed data
-- Run AFTER 001_course_system.sql in Supabase SQL Editor

-- Insert courses (id is auto; we capture ids via CTE for lessons)
with new_courses as (
  insert into public.courses (title, subject, description, color, icon, estimated_hours, is_published)
  values
    ('English Reading Comprehension', 'Language', 'Master main ideas, supporting details, and evidence-based reading strategies.', '#A9D8AE', 'BookOpen', 4.5, true),
    ('Intro to Algebra', 'Mathematics', 'Build a solid foundation in algebraic thinking, from variables and expressions through to solving multi-step equations.', '#B9D1E5', 'Code', 8, true),
    ('World History: Modern Era', 'History', 'Explore the key events, movements, and ideas that shaped the modern world.', '#E5D1B9', 'MessagesSquare', 6, true)
  returning id, title
),
ordered as (
  select id, title, row_number() over () as rn from new_courses
)
-- no-op select to keep CTE valid when run standalone
select * from ordered;

-- NOTE: lessons need real course ids. Run the block below after courses exist.
-- It looks up courses by title so it is idempotent-safe (delete-then-insert per course).

-- Clean existing seed lessons for these 3 courses (safe to re-run)
delete from public.lessons where course_id in (
  select id from public.courses where title in (
    'English Reading Comprehension', 'Intro to Algebra', 'World History: Modern Era'
  )
);

-- English Reading Comprehension (5 lessons)
insert into public.lessons (course_id, title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty)
select id, t.title, t.summary, t.duration_min, t.difficulty, t.position, t.xp_reward, t.coins_reward, t.material_name, t.material_qty
from public.courses c
join (values
  ('Finding the Main Idea', 'Identify the central point of a passage quickly.', 12, 'Easy', 1, 40, 15, 'Bricks', 2),
  ('Supporting Details', 'Use evidence sentences to back up the main idea.', 15, 'Easy', 2, 40, 15, 'Bricks', 2),
  ('Author''s Purpose', 'Distinguish inform, persuade, and entertain.', 18, 'Medium', 3, 60, 20, 'Timber', 3),
  ('Inference & Evidence', 'Read between the lines and cite proof.', 22, 'Medium', 4, 60, 20, 'Timber', 3),
  ('Timed Comprehension', 'Apply every strategy under exam timing.', 25, 'Hard', 5, 90, 30, 'Rare gem', 1)
) as t(title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty)
on c.title = 'English Reading Comprehension';

-- Intro to Algebra (6 lessons)
insert into public.lessons (course_id, title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty)
select id, t.title, t.summary, t.duration_min, t.difficulty, t.position, t.xp_reward, t.coins_reward, t.material_name, t.material_qty
from public.courses c
join (values
  ('Variables and Expressions', 'Translate words into algebraic expressions.', 12, 'Easy', 1, 40, 15, 'Bricks', 2),
  ('Linear Equations', 'Solve one- and two-step equations.', 15, 'Easy', 2, 40, 15, 'Bricks', 2),
  ('Inequalities', 'Graph and solve single-variable inequalities.', 18, 'Medium', 3, 60, 20, 'Timber', 3),
  ('Systems of Equations', 'Solve by substitution and elimination.', 22, 'Medium', 4, 60, 20, 'Timber', 3),
  ('Quadratic Equations', 'Factor and use the quadratic formula.', 25, 'Hard', 5, 90, 30, 'Rare gem', 1),
  ('Polynomials', 'Add, subtract, and multiply polynomials.', 20, 'Hard', 6, 90, 30, 'Rare gem', 1)
) as t(title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty)
on c.title = 'Intro to Algebra';

-- World History: Modern Era (6 lessons)
insert into public.lessons (course_id, title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty)
select id, t.title, t.summary, t.duration_min, t.difficulty, t.position, t.xp_reward, t.coins_reward, t.material_name, t.material_qty
from public.courses c
join (values
  ('Industrial Revolution', 'How industry reshaped work and cities.', 14, 'Easy', 1, 40, 15, 'Bricks', 2),
  ('Age of Imperialism', 'Causes and consequences of global empires.', 16, 'Easy', 2, 40, 15, 'Bricks', 2),
  ('World War I', 'Alliances, fronts, and the road to Versailles.', 20, 'Medium', 3, 60, 20, 'Timber', 3),
  ('Interwar Years', 'Depression, totalitarianism, and unrest.', 20, 'Medium', 4, 60, 20, 'Timber', 3),
  ('World War II', 'Global conflict and its turning points.', 25, 'Hard', 5, 90, 30, 'Rare gem', 1),
  ('Cold War & Beyond', 'Bipolar rivalry to a globalized present.', 22, 'Hard', 6, 90, 30, 'Rare gem', 1)
) as t(title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty)
on c.title = 'World History: Modern Era';

-- ============================================================
-- LESSON CONTENT (markdown body rendered on the lesson show page)
-- Matched by (course title, lesson title) so it is safe to re-run.
-- ============================================================
update public.lessons l
set content = t.content
from (values
  ('English Reading Comprehension', 'Finding the Main Idea', $md$## What is the main idea?

The main idea is the single most important point a writer wants you to take away from a passage. Everything else in the paragraph — examples, statistics, descriptions — exists to support that one point.

### How to find it
1. **Read the first and last sentence of a paragraph first.** Writers often state or restate the main idea there.
2. **Ask "what is this paragraph mostly about?"** — not "what is mentioned in it."
3. **Watch out for supporting details disguised as the main idea.** A specific fact (e.g. "Bees pollinate 1 in 3 bites of food") is usually evidence *for* a bigger claim ("Bees are critical to our food supply"), not the main idea itself.

### Worked example
> Cities around the world are investing heavily in bike lanes. Copenhagen has built over 400 km of dedicated bike paths. In Bogotá, car-free Sundays draw over a million cyclists. These changes cut emissions and ease traffic congestion.

The main idea isn't "Copenhagen has 400 km of bike paths" (that's a detail) — it's that **cities are redesigning around cycling to fight congestion and emissions**.

### Practice tip
Try summarizing a paragraph in exactly one sentence, using your own words, before checking the answer choices in a comprehension question. If your one-sentence summary matches an answer choice closely, that's very likely the main idea.$md$),

  ('English Reading Comprehension', 'Supporting Details', $md$## What are supporting details?

Supporting details are the facts, examples, statistics, and explanations a writer uses to prove or expand on the main idea. If the main idea is the claim, supporting details are the evidence.

### Types of supporting details
- **Facts and statistics** — numbers, dates, measurable data
- **Examples** — specific instances that illustrate a general point
- **Reasons** — explanations of *why* something is true
- **Descriptions** — sensory or descriptive detail that paints a picture

### How to use them
When a question asks "according to the passage," it wants a supporting detail, not your own interpretation — the answer should be traceable to an exact sentence or phrase in the text.

### Worked example
> Solar panel costs have dropped 90% since 2010. As a result, more homeowners are switching to solar than ever before.

Main idea: *solar power is becoming more accessible.* Supporting detail: *costs have dropped 90% since 2010.* Notice the detail is specific and measurable — that's a strong signal it's a detail, not the main idea.

### Practice tip
Underline (or mentally flag) every number, name, and date as you read — these are almost always supporting details, and questions love to reference them directly.$md$),

  ('English Reading Comprehension', 'Author''s Purpose', $md$## Why did the author write this?

Every piece of writing has a purpose. The three most common purposes are:

- **To inform** — presenting facts neutrally (news articles, textbooks, encyclopedia entries)
- **To persuade** — trying to change your opinion or behavior (opinion pieces, advertisements, speeches)
- **To entertain** — telling a story or engaging your imagination (fiction, humor, narrative essays)

### Clues to look for
| Purpose | Common clues |
|---|---|
| Inform | Statistics, dates, neutral tone, "studies show" |
| Persuade | Opinion words ("should," "must"), emotional appeals, one-sided arguments |
| Entertain | Dialogue, vivid description, plot, characters |

### Worked example
> You should switch to a reusable water bottle today. Plastic bottles take 450 years to decompose, and every purchase funds an industry that is choking our oceans.

This is **persuasive** — note the direct command ("you should") and the emotionally charged phrase "choking our oceans," which goes beyond neutral fact-reporting.

### Practice tip
If you can imagine the same information being reported with zero emotional language and it would lose its punch, the author is probably persuading, not just informing.$md$),

  ('English Reading Comprehension', 'Inference & Evidence', $md$## Reading between the lines

An inference is a conclusion you draw based on evidence in the text plus your own reasoning — the passage never states it directly, but it's strongly implied.

### The inference formula
**Text evidence + logic = inference**

You should always be able to point to the specific sentence(s) that led you to your conclusion. If you can't, you've made a guess, not an inference.

### Worked example
> Maria checked her watch for the third time, then gathered her papers and slipped quietly toward the door before the professor could call on her.

We can infer Maria is trying to leave without being noticed, possibly because she's unprepared or in a hurry — the passage never says this outright, but "checked her watch," "quietly," and "before the professor could call on her" all point to it.

### Common inference traps
- **Overreaching** — going far beyond what the evidence supports (e.g. concluding Maria hates the class, which isn't supported).
- **Ignoring evidence** — picking an answer that contradicts a detail in the passage.

### Practice tip
For every inference question, ask: "Which exact words in the passage support this?" If you can't find them, reconsider your answer.$md$),

  ('English Reading Comprehension', 'Timed Comprehension', $md$## Putting it all together under time pressure

By now you know how to find the main idea, spot supporting details, identify author's purpose, and make inferences. The last skill is applying all four quickly and accurately under a time limit.

### A reliable strategy
1. **Skim first (30–45 seconds).** Read the first and last sentence of each paragraph to build a mental map.
2. **Read the questions before rereading the passage.** This tells you what to look for.
3. **Go back to the text for evidence** — don't answer from memory alone.
4. **Eliminate answers that are too extreme** (words like "always," "never," "all") — passages are rarely that absolute.
5. **Flag and move on.** Don't let one hard question eat your remaining time; come back if there's time left.

### Pacing guide
For a passage with 5 questions in a 10-minute window, budget roughly:
- 1.5 minutes to skim the passage
- 1.5 minutes per question, evidence-checking included

### Practice tip
Time yourself on practice passages and track where the minutes actually go — most students lose time rereading the whole passage instead of scanning back to the relevant paragraph for each specific question.$md$),

  ('Intro to Algebra', 'Variables and Expressions', $md$## From words to symbols

A **variable** is a letter (commonly $x$, $y$, or $n$) that stands in for an unknown or changing number. An **expression** combines variables, numbers, and operations — but unlike an equation, it has no equals sign.

### Translating phrases
| English phrase | Expression |
|---|---|
| "5 more than a number" | $x + 5$ |
| "a number decreased by 3" | $x - 3$ |
| "twice a number" | $2x$ |
| "a number split into 4 equal parts" | $x / 4$ |

### Evaluating an expression
To evaluate $3x + 7$ when $x = 4$: substitute and calculate.
$$3(4) + 7 = 12 + 7 = 19$$

### Combining like terms
Terms are "like" if they have the exact same variable (and exponent). $3x + 5x = 8x$, but $3x + 5y$ cannot be combined further.

### Practice tip
When translating a word problem, underline the operation words first ("more than" → add, "less than" → subtract, "times"/"of" → multiply, "split"/"per" → divide) before writing the expression.$md$),

  ('Intro to Algebra', 'Linear Equations', $md$## Solving for the unknown

A linear equation states that two expressions are equal, and your goal is to isolate the variable — get it alone on one side.

### The golden rule
Whatever you do to one side of the equation, you must do to the other side, to keep it balanced.

### One-step equations
$$x + 7 = 12 \implies x = 12 - 7 = 5$$

### Two-step equations
$$2x + 3 = 11$$
1. Subtract 3 from both sides: $2x = 8$
2. Divide both sides by 2: $x = 4$

### Checking your answer
Always substitute your solution back into the original equation. For $x = 4$: $2(4) + 3 = 8 + 3 = 11$ ✓ — it matches, so the solution is correct.

### Practice tip
Work in the reverse order of operations: undo addition/subtraction before undoing multiplication/division, since that mirrors how the equation was built up.$md$),

  ('Intro to Algebra', 'Inequalities', $md$## Beyond equals: greater than and less than

An inequality compares two expressions using $<$, $>$, $\leq$, or $\geq$ instead of $=$. Its solution isn't a single number — it's a whole range of numbers.

### Solving like an equation — with one exception
Inequalities solve exactly like equations, **except**: multiplying or dividing both sides by a negative number flips the inequality sign.

$$-2x > 8$$
Divide both sides by $-2$ **and flip the sign**: $x < -4$

### Graphing on a number line
- **Open circle** for $<$ or $>$ (the boundary value is not included)
- **Closed circle** for $\leq$ or $\geq$ (the boundary value is included)
- Shade the direction the solution extends

### Worked example
$$3x - 5 \leq 10 \implies 3x \leq 15 \implies x \leq 5$$
Graph: a closed circle at 5, shaded to the left.

### Practice tip
After solving, plug in a value from your shaded region into the *original* inequality to double-check it holds true.$md$),

  ('Intro to Algebra', 'Systems of Equations', $md$## Solving two equations at once

A system of equations is a set of two (or more) equations sharing the same variables. The solution is the point $(x, y)$ that satisfies *both* equations simultaneously.

### Method 1: Substitution
Solve one equation for a variable, then substitute that expression into the other equation.

$$y = x + 2 \quad \text{and} \quad 2x + y = 10$$
Substitute: $2x + (x + 2) = 10 \implies 3x = 8 \implies x = \tfrac{8}{3}$

### Method 2: Elimination
Add or subtract the equations to cancel out one variable.

$$x + y = 10$$
$$x - y = 2$$
Add both equations: $2x = 12 \implies x = 6$, then $y = 4$.

### When to use which
- **Substitution** works best when a variable is already isolated (or easy to isolate).
- **Elimination** works best when coefficients line up nicely (or can with a quick multiplication).

### Practice tip
After solving, plug both values back into *both* original equations — a solution must satisfy every equation in the system, not just one.$md$),

  ('Intro to Algebra', 'Quadratic Equations', $md$## Equations with a squared term

A quadratic equation has the form $ax^2 + bx + c = 0$. Because of the squared term, it typically has **two** solutions.

### Method 1: Factoring
Find two numbers that multiply to $c$ and add to $b$.

$$x^2 + 5x + 6 = 0 \implies (x + 2)(x + 3) = 0 \implies x = -2 \text{ or } x = -3$$

### Method 2: The quadratic formula
When factoring isn't easy, use:
$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

For $x^2 + 5x + 6 = 0$ (where $a=1, b=5, c=6$):
$$x = \frac{-5 \pm \sqrt{25 - 24}}{2} = \frac{-5 \pm 1}{2} \implies x = -2 \text{ or } -3$$

### The discriminant ($b^2 - 4ac$)
- **Positive** → two real solutions
- **Zero** → exactly one real solution
- **Negative** → no real solutions

### Practice tip
Always try factoring first — it's faster — and fall back to the quadratic formula only when the numbers don't factor cleanly.$md$),

  ('Intro to Algebra', 'Polynomials', $md$## Expressions with multiple terms

A polynomial is an expression made of terms combined with addition or subtraction, each term being a number, a variable, or a product of both (e.g. $3x^2 - 5x + 7$).

### Adding and subtracting
Combine like terms only — terms with the same variable raised to the same power.

$$(3x^2 + 2x - 1) + (x^2 - 5x + 4) = 4x^2 - 3x + 3$$

### Multiplying binomials (FOIL)
**F**irst, **O**uter, **I**nner, **L**ast:

$$(x + 3)(x + 5) = x^2 + 5x + 3x + 15 = x^2 + 8x + 15$$

### Multiplying a monomial by a polynomial
Distribute the monomial across every term:
$$2x(x^2 + 3x - 4) = 2x^3 + 6x^2 - 8x$$

### Practice tip
Line up terms by their exponent (like a place-value chart) when adding or subtracting long polynomials — it makes it much harder to accidentally miss a term.$md$),

  ('World History: Modern Era', 'Industrial Revolution', $md$## From farms to factories

The Industrial Revolution (roughly 1760–1840) began in Britain and transformed how goods were made — from hand production in homes and small workshops to mass production in factories powered by machines.

### Key drivers
- **The steam engine** (James Watt's improvements, 1770s) powered factories, trains, and ships independent of water or wind.
- **Textile innovations** — the spinning jenny and power loom dramatically increased cloth output.
- **Coal and iron** — cheap, abundant fuel and stronger metal enabled bigger machines and railways.

### Social impact
Millions moved from rural farms to fast-growing industrial cities, seeking factory work. This urbanization brought:
- New job opportunities but often dangerous working conditions and long hours
- Overcrowded housing and public health challenges
- The rise of a new working (labor) class, which later organized into unions

### Why it matters
The Industrial Revolution set the pattern for how economies grow today: mechanization, urbanization, and mass production still define how most goods reach us.

### Practice tip
When you see "revolution" in history, ask "what changed, how fast, and who was affected most?" — that's the fastest way into any major historical shift.$md$),

  ('World History: Modern Era', 'Age of Imperialism', $md$## Empires spanning the globe

Imperialism is the policy of extending a country's power through colonization, military force, or economic dominance over other territories. The late 1800s saw European powers rapidly claim territory across Africa and Asia — a period often called the "Scramble for Africa."

### Motivations (often remembered as "3 C's")
- **Commerce** — raw materials (rubber, cotton, minerals) and new markets for manufactured goods
- **Competition** — rival powers (Britain, France, Germany, others) racing not to fall behind
- **"Civilizing mission"** — a (often self-serving) justification that imperial powers were bringing progress or religion to colonized peoples

### Consequences
- Colonized regions lost political sovereignty and often had their economies restructured to serve the colonizer
- Borders were frequently drawn without regard to existing ethnic or cultural groups, causing conflicts that persist today
- Resistance movements emerged, planting the seeds of 20th-century independence struggles

### Practice tip
When studying imperialism, separate the *stated* justification from the *actual* motive (usually economic) — history questions often test whether you can spot that gap.$md$),

  ('World History: Modern Era', 'World War I', $md$## The war that redrew the map

World War I (1914–1918) began after the assassination of Archduke Franz Ferdinand of Austria-Hungary, but its deeper causes had been building for years.

### Underlying causes (MAIN)
- **M**ilitarism — an arms race among major powers
- **A**lliances — a web of defense treaties that pulled countries into war one after another
- **I**mperialism — competition over colonies and resources
- **N**ationalism — intense pride and rivalry between nations and ethnic groups

### Trench warfare
Much of the Western Front became a stalemate of trench warfare — opposing armies dug in, separated by "no man's land," with new weapons (machine guns, poison gas, tanks) causing massive casualties for little territorial gain.

### The end and its aftermath
The war ended in 1918 with an armistice, followed by the **Treaty of Versailles (1919)**, which placed heavy blame and reparations on Germany — a decision that fueled resentment and contributed to the rise of extremism in the following decades.

### Practice tip
Remember MAIN as the four long-term causes, then the assassination as the immediate "spark" — most exam questions distinguish between the two.$md$),

  ('World History: Modern Era', 'Interwar Years', $md$## The uneasy peace (1918–1939)

The two decades between the world wars were marked by economic instability and the rise of authoritarian governments.

### Economic turmoil
- Germany faced hyperinflation in the early 1920s as it struggled to pay war reparations.
- The **Great Depression** (starting 1929) caused mass unemployment worldwide, deepening political instability.

### Rise of totalitarianism
Economic desperation created fertile ground for leaders promising strong, decisive action:
- **Benito Mussolini** in Italy established a fascist state built on nationalism and single-party rule.
- **Adolf Hitler** rose to power in Germany in 1933, exploiting economic despair and resentment over the Treaty of Versailles.
- **Joseph Stalin** consolidated totalitarian control in the Soviet Union through political purges and forced industrialization.

### Failed diplomacy
The **League of Nations**, formed to prevent future wars, lacked enforcement power and failed to stop aggressive expansion by Italy, Japan, and Germany in the 1930s.

### Practice tip
Link each country's economic crisis directly to the political movement it enabled — cause-and-effect questions on this period are extremely common.$md$),

  ('World History: Modern Era', 'World War II', $md$## A truly global conflict

World War II (1939–1945) began when Germany invaded Poland, drawing in Britain and France, and eventually expanded to involve nearly every major world power.

### Key turning points
- **Pearl Harbor (1941)** brought the United States into the war after Japan's surprise attack.
- **Stalingrad (1942–43)** marked a decisive Soviet victory that halted the German advance into the USSR.
- **D-Day (June 1944)** opened a Western front, with Allied forces landing in Normandy.
- **Atomic bombings of Hiroshima and Nagasaki (1945)** led to Japan's surrender, ending the war.

### The Holocaust
Nazi Germany's systematic genocide murdered six million Jews, along with millions of Roma, disabled people, and other targeted groups — one of the most devastating atrocities in human history.

### Aftermath
The war left much of Europe and Asia in ruins, led to the founding of the **United Nations**, and set up the two emerging superpowers — the United States and the Soviet Union — for the next several decades of rivalry.

### Practice tip
Build a simple timeline of the five turning points above in order — most comprehension questions test whether you understand the sequence, not just isolated facts.$md$),

  ('World History: Modern Era', 'Cold War & Beyond', $md$## A world divided — without direct war

The Cold War (roughly 1947–1991) was a prolonged geopolitical standoff between the United States and the Soviet Union — fought through proxy wars, espionage, and an arms race, but never direct combat between the two superpowers.

### Key flashpoints
- **Berlin Wall (1961–1989)** physically divided a city — and symbolized the divide between communist East and capitalist West.
- **Cuban Missile Crisis (1962)** brought the world to the brink of nuclear war over Soviet missiles stationed in Cuba.
- **Proxy wars** in Korea, Vietnam, and Afghanistan saw the superpowers support opposing sides without fighting each other directly.

### The end of the Cold War
Economic strain, reform movements (like Mikhail Gorbachev's *glasnost* and *perestroika*), and popular uprisings led to the fall of the Berlin Wall in 1989 and the dissolution of the Soviet Union in 1991.

### The globalized present
Since then, the world has moved toward greater economic interdependence, rapid technological change, and new challenges — regional conflicts, climate change, and shifting power balances among nations.

### Practice tip
Think of the Cold War as a war fought through *everything except* direct combat between the two superpowers — economics, propaganda, space races, and proxy wars all substituted for a "hot" war.$md$)
) as t(course_title, lesson_title, content)
join public.courses c on c.title = t.course_title
where l.course_id = c.id and l.title = t.lesson_title;

-- ============================================================
-- QUIZZES (one per lesson, matched by course + lesson title)
-- Safe to re-run: clears existing quizzes for these lessons first,
-- which cascades to their questions/options via foreign keys.
-- ============================================================
delete from public.quizzes where lesson_id in (
  select l.id from public.lessons l
  join public.courses c on c.id = l.course_id
  where c.title in ('English Reading Comprehension', 'Intro to Algebra', 'World History: Modern Era')
);

insert into public.quizzes (lesson_id, title, passing_score, xp_reward, coins_reward)
select l.id, 'Quiz: ' || l.title, 70, 20, 10
from public.lessons l
join public.courses c on c.id = l.course_id
where c.title in ('English Reading Comprehension', 'Intro to Algebra', 'World History: Modern Era');

-- ============================================================
-- QUIZ QUESTIONS (3 per lesson, matched via lesson title)
-- ============================================================
insert into public.quiz_questions (quiz_id, question, explanation, position, points)
select q.id, x.question, x.explanation, x.position, 1
from public.quizzes q
join public.lessons l on l.id = q.lesson_id
join (values
  ('Finding the Main Idea', 'What is the main idea of a paragraph?', 'The main idea is the single overall point everything else in the paragraph supports.', 1),
  ('Finding the Main Idea', 'Which sentences most often state the main idea?', 'Writers often state or restate the main idea in the first and/or last sentence of a paragraph.', 2),
  ('Finding the Main Idea', 'A very specific statistic in a paragraph is usually a...', 'Specific numbers and facts are supporting details that back up the broader main idea.', 3),

  ('Supporting Details', 'Supporting details serve to...', 'Supporting details are the evidence — facts, examples, and reasons — that back up the main idea.', 1),
  ('Supporting Details', 'Which of these is a supporting detail rather than a main idea?', 'A specific, measurable fact like a percentage or date is a supporting detail, not the overall point.', 2),
  ('Supporting Details', 'When a question asks "according to the passage," it wants...', 'Such questions want an answer directly traceable to the text, not your own outside opinion.', 3),

  ('Author''s Purpose', 'The three common authors'' purposes are...', 'The three classic purposes for writing are to inform, to persuade, and to entertain.', 1),
  ('Author''s Purpose', 'A passage using emotional language and phrases like "you should" is most likely trying to...', 'Direct commands and emotionally charged language are hallmarks of persuasive writing.', 2),
  ('Author''s Purpose', 'A passage full of neutral statistics and dates is most likely written to...', 'Neutral, fact-based writing without opinion or emotional appeal is typically meant to inform.', 3),

  ('Inference & Evidence', 'An inference is best described as...', 'An inference combines textual evidence with your own reasoning to reach a conclusion the text implies but never states directly.', 1),
  ('Inference & Evidence', 'A strong inference should always be...', 'A valid inference must be traceable to specific evidence in the passage — otherwise it is just a guess.', 2),
  ('Inference & Evidence', 'Which is a common inference trap?', 'Overreaching — drawing a conclusion far beyond what the text actually supports — is a classic inference mistake.', 3),

  ('Timed Comprehension', 'What should you do first when starting a timed passage?', 'Skimming the first and last sentence of each paragraph builds a quick mental map before you dive into questions.', 1),
  ('Timed Comprehension', 'Answer choices containing words like "always" or "never" are often...', 'Extreme, absolute language is rarely supported by real passages, so such answers are frequently incorrect.', 2),
  ('Timed Comprehension', 'If a question is taking too long, you should...', 'Flagging a hard question and returning to it later protects your time for questions you can answer confidently first.', 3),

  ('Variables and Expressions', 'What does a variable represent?', 'A variable is a letter that stands in for an unknown or changing number.', 1),
  ('Variables and Expressions', 'What is the expression for "5 more than a number"?', '"More than" signals addition, so the expression is x + 5.', 2),
  ('Variables and Expressions', 'What is the value of 3x + 7 when x = 4?', 'Substituting x = 4 gives 3(4) + 7 = 12 + 7 = 19.', 3),

  ('Linear Equations', 'What is the golden rule for solving equations?', 'Whatever operation you apply to one side of the equation, you must apply to the other side to keep it balanced.', 1),
  ('Linear Equations', 'Solve: x + 7 = 12', 'Subtracting 7 from both sides gives x = 5.', 2),
  ('Linear Equations', 'Solve: 2x + 3 = 11', 'Subtract 3 from both sides to get 2x = 8, then divide by 2 to get x = 4.', 3),

  ('Inequalities', 'What happens when you multiply or divide both sides of an inequality by a negative number?', 'Multiplying or dividing by a negative number flips the direction of the inequality sign.', 1),
  ('Inequalities', 'On a number line, an open circle represents...', 'An open circle is used for strict inequalities (< or >), meaning the boundary value itself is not included.', 2),
  ('Inequalities', 'Solve: 3x - 5 ≤ 10', 'Adding 5 to both sides gives 3x ≤ 15, then dividing by 3 gives x ≤ 5.', 3),

  ('Systems of Equations', 'A solution to a system of equations must satisfy...', 'A valid solution to a system must satisfy every equation in the system simultaneously, not just one.', 1),
  ('Systems of Equations', 'Substitution works best when...', 'Substitution is easiest when a variable is already isolated or can be isolated quickly.', 2),
  ('Systems of Equations', 'Given x + y = 10 and x - y = 2, what is x?', 'Adding both equations eliminates y: 2x = 12, so x = 6.', 3),

  ('Quadratic Equations', 'A quadratic equation typically has how many solutions?', 'Because of the squared term, a quadratic equation typically has two solutions.', 1),
  ('Quadratic Equations', 'Factor x² + 5x + 6 = 0. What are the solutions?', 'The expression factors as (x + 2)(x + 3) = 0, giving x = -2 or x = -3.', 2),
  ('Quadratic Equations', 'If the discriminant (b² - 4ac) is negative, the equation has...', 'A negative discriminant means there are no real solutions to the quadratic equation.', 3),

  ('Polynomials', 'What does FOIL stand for when multiplying binomials?', 'FOIL stands for First, Outer, Inner, Last — the four products needed to multiply two binomials.', 1),
  ('Polynomials', 'What terms can be combined when adding polynomials?', 'Only like terms — terms with the same variable raised to the same power — can be combined.', 2),
  ('Polynomials', 'Multiply: 2x(x² + 3x - 4)', 'Distributing 2x across each term gives 2x³ + 6x² - 8x.', 3),

  ('Industrial Revolution', 'What powered factories independent of water or wind?', 'The steam engine, improved by James Watt, allowed factories to run without relying on water or wind power.', 1),
  ('Industrial Revolution', 'What major population shift occurred during the Industrial Revolution?', 'Millions of people moved from rural farms to fast-growing industrial cities to seek factory work.', 2),
  ('Industrial Revolution', 'Which resources were key drivers of industrialization?', 'Abundant coal and iron enabled the construction of bigger machines and railway networks.', 3),

  ('Age of Imperialism', 'What are the "3 C''s" often used to explain imperialism''s motivations?', 'Commerce, Competition, and the (self-serving) "Civilizing mission" are the three commonly cited motivations.', 1),
  ('Age of Imperialism', 'What was a major long-term consequence of colonial borders?', 'Borders drawn without regard to existing ethnic or cultural groups caused conflicts that persist today.', 2),
  ('Age of Imperialism', 'What was the real driving motive behind imperialism, despite stated justifications?', 'Although often justified as a "civilizing mission," the actual driving motive was typically economic gain.', 3),

  ('World War I', 'What does the acronym MAIN represent?', 'MAIN stands for Militarism, Alliances, Imperialism, and Nationalism — the long-term causes of WWI.', 1),
  ('World War I', 'What characterized much of the fighting on the Western Front?', 'Trench warfare created a stalemate, with opposing armies dug in and separated by no man''s land.', 2),
  ('World War I', 'What was a major consequence of the Treaty of Versailles?', 'The treaty placed heavy blame and reparations on Germany, fueling resentment that contributed to later extremism.', 3),

  ('Interwar Years', 'What economic event deepened political instability worldwide starting in 1929?', 'The Great Depression caused mass unemployment worldwide, creating fertile ground for political extremism.', 1),
  ('Interwar Years', 'Which leader established a fascist state in Italy?', 'Benito Mussolini established a fascist, single-party state built on nationalism in Italy.', 2),
  ('Interwar Years', 'Why did the League of Nations fail to prevent renewed conflict?', 'The League of Nations lacked enforcement power and could not stop aggressive expansion in the 1930s.', 3),

  ('World War II', 'What event brought the United States into World War II?', 'Japan''s surprise attack on Pearl Harbor in 1941 brought the United States into the war.', 1),
  ('World War II', 'What battle marked a turning point that halted the German advance into the USSR?', 'The Soviet victory at Stalingrad (1942-43) was a decisive turning point on the Eastern Front.', 2),
  ('World War II', 'What international organization was founded in the aftermath of World War II?', 'The United Nations was founded after the war to promote international cooperation and prevent future conflicts.', 3),

  ('Cold War & Beyond', 'How was the Cold War primarily "fought"?', 'The Cold War was fought through proxy wars, espionage, and an arms race, without direct combat between the superpowers.', 1),
  ('Cold War & Beyond', 'What event brought the world to the brink of nuclear war in 1962?', 'The Cuban Missile Crisis, over Soviet missiles stationed in Cuba, brought the world close to nuclear war.', 2),
  ('Cold War & Beyond', 'What reforms did Mikhail Gorbachev introduce that contributed to the Cold War''s end?', 'Gorbachev''s reforms of glasnost (openness) and perestroika (restructuring) contributed to the Soviet Union''s collapse.', 3)
) as x(lesson_title, question, explanation, position)
on x.lesson_title = l.title;

-- ============================================================
-- QUIZ OPTIONS (4 per question, matched via lesson title + question position)
-- ============================================================
insert into public.quiz_options (question_id, option_text, is_correct, position)
select qq.id, x.option_text, x.is_correct, x.position
from public.quiz_questions qq
join public.quizzes q on q.id = qq.quiz_id
join public.lessons l on l.id = q.lesson_id
join (values
  ('Finding the Main Idea', 1, 'A random detail mentioned anywhere in the text', false, 1),
  ('Finding the Main Idea', 1, 'The single overall point the passage supports', true, 2),
  ('Finding the Main Idea', 1, 'The last word of the passage', false, 3),
  ('Finding the Main Idea', 1, 'The author''s name', false, 4),

  ('Finding the Main Idea', 2, 'The middle sentences only', false, 1),
  ('Finding the Main Idea', 2, 'The first and/or last sentence', true, 2),
  ('Finding the Main Idea', 2, 'Footnotes', false, 3),
  ('Finding the Main Idea', 2, 'The title only, never the body', false, 4),

  ('Finding the Main Idea', 3, 'Main idea', false, 1),
  ('Finding the Main Idea', 3, 'Supporting detail', true, 2),
  ('Finding the Main Idea', 3, 'Author''s purpose', false, 3),
  ('Finding the Main Idea', 3, 'Inference', false, 4),

  ('Supporting Details', 1, 'Replace the main idea entirely', false, 1),
  ('Supporting Details', 1, 'Prove or expand on the main idea', true, 2),
  ('Supporting Details', 1, 'Confuse the reader', false, 3),
  ('Supporting Details', 1, 'State the author''s opinion only', false, 4),

  ('Supporting Details', 2, 'A broad summary statement', false, 1),
  ('Supporting Details', 2, 'A specific percentage or statistic', true, 2),
  ('Supporting Details', 2, 'The passage''s title', false, 3),
  ('Supporting Details', 2, 'A rhetorical question', false, 4),

  ('Supporting Details', 3, 'Your own personal opinion', false, 1),
  ('Supporting Details', 3, 'An answer directly traceable to the text', true, 2),
  ('Supporting Details', 3, 'A guess based on the title', false, 3),
  ('Supporting Details', 3, 'Information from outside the passage', false, 4),

  ('Author''s Purpose', 1, 'Inform, persuade, entertain', true, 1),
  ('Author''s Purpose', 1, 'Summarize, quote, cite', false, 2),
  ('Author''s Purpose', 1, 'Question, answer, repeat', false, 3),
  ('Author''s Purpose', 1, 'Describe, list, count', false, 4),

  ('Author''s Purpose', 2, 'Inform', false, 1),
  ('Author''s Purpose', 2, 'Persuade', true, 2),
  ('Author''s Purpose', 2, 'Entertain', false, 3),
  ('Author''s Purpose', 2, 'None of the above', false, 4),

  ('Author''s Purpose', 3, 'Persuade', false, 1),
  ('Author''s Purpose', 3, 'Entertain', false, 2),
  ('Author''s Purpose', 3, 'Inform', true, 3),
  ('Author''s Purpose', 3, 'Confuse', false, 4),

  ('Inference & Evidence', 1, 'A direct quote from the passage', false, 1),
  ('Inference & Evidence', 1, 'Text evidence combined with your own reasoning', true, 2),
  ('Inference & Evidence', 1, 'A random guess', false, 3),
  ('Inference & Evidence', 1, 'The passage''s title', false, 4),

  ('Inference & Evidence', 2, 'Based on outside knowledge only', false, 1),
  ('Inference & Evidence', 2, 'Traceable to specific evidence in the passage', true, 2),
  ('Inference & Evidence', 2, 'The most dramatic possible conclusion', false, 3),
  ('Inference & Evidence', 2, 'Impossible to explain', false, 4),

  ('Inference & Evidence', 3, 'Underlining every sentence', false, 1),
  ('Inference & Evidence', 3, 'Overreaching beyond what the evidence supports', true, 2),
  ('Inference & Evidence', 3, 'Reading too slowly', false, 3),
  ('Inference & Evidence', 3, 'Skipping the questions', false, 4),

  ('Timed Comprehension', 1, 'Answer every question from memory first', false, 1),
  ('Timed Comprehension', 1, 'Skim the first and last sentence of each paragraph', true, 2),
  ('Timed Comprehension', 1, 'Read the passage backwards', false, 3),
  ('Timed Comprehension', 1, 'Skip the passage and guess', false, 4),

  ('Timed Comprehension', 2, 'Correct', false, 1),
  ('Timed Comprehension', 2, 'Incorrect', true, 2),
  ('Timed Comprehension', 2, 'Always correct', false, 3),
  ('Timed Comprehension', 2, 'Impossible to tell', false, 4),

  ('Timed Comprehension', 3, 'Keep rereading it until time runs out', false, 1),
  ('Timed Comprehension', 3, 'Flag it and move on, returning later if time allows', true, 2),
  ('Timed Comprehension', 3, 'Skip the rest of the section', false, 3),
  ('Timed Comprehension', 3, 'Guess without reading the question again', false, 4),

  ('Variables and Expressions', 1, 'A fixed constant that never changes', false, 1),
  ('Variables and Expressions', 1, 'A letter standing in for an unknown or changing number', true, 2),
  ('Variables and Expressions', 1, 'An operation symbol', false, 3),
  ('Variables and Expressions', 1, 'A type of equation', false, 4),

  ('Variables and Expressions', 2, 'x - 5', false, 1),
  ('Variables and Expressions', 2, 'x + 5', true, 2),
  ('Variables and Expressions', 2, '5x', false, 3),
  ('Variables and Expressions', 2, 'x / 5', false, 4),

  ('Variables and Expressions', 3, '12', false, 1),
  ('Variables and Expressions', 3, '19', true, 2),
  ('Variables and Expressions', 3, '21', false, 3),
  ('Variables and Expressions', 3, '28', false, 4),

  ('Linear Equations', 1, 'Only change the left side', false, 1),
  ('Linear Equations', 1, 'Apply the same operation to both sides', true, 2),
  ('Linear Equations', 1, 'Only change the right side', false, 3),
  ('Linear Equations', 1, 'Multiply both sides by zero', false, 4),

  ('Linear Equations', 2, 'x = 19', false, 1),
  ('Linear Equations', 2, 'x = 5', true, 2),
  ('Linear Equations', 2, 'x = -5', false, 3),
  ('Linear Equations', 2, 'x = 7', false, 4),

  ('Linear Equations', 3, 'x = 8', false, 1),
  ('Linear Equations', 3, 'x = 4', true, 2),
  ('Linear Equations', 3, 'x = 3', false, 3),
  ('Linear Equations', 3, 'x = 14', false, 4),

  ('Inequalities', 1, 'Nothing changes', false, 1),
  ('Inequalities', 1, 'The inequality sign flips direction', true, 2),
  ('Inequalities', 1, 'The variable disappears', false, 3),
  ('Inequalities', 1, 'The equation becomes an equality', false, 4),

  ('Inequalities', 2, 'The boundary value is included', false, 1),
  ('Inequalities', 2, 'The boundary value is not included', true, 2),
  ('Inequalities', 2, 'There is no boundary value', false, 3),
  ('Inequalities', 2, 'The graph has no shading', false, 4),

  ('Inequalities', 3, 'x ≤ 5', true, 1),
  ('Inequalities', 3, 'x ≥ 5', false, 2),
  ('Inequalities', 3, 'x ≤ 15', false, 3),
  ('Inequalities', 3, 'x < -5', false, 4),

  ('Systems of Equations', 1, 'Only one of the equations', false, 1),
  ('Systems of Equations', 1, 'Every equation in the system simultaneously', true, 2),
  ('Systems of Equations', 1, 'Neither equation', false, 3),
  ('Systems of Equations', 1, 'Whichever equation is listed first', false, 4),

  ('Systems of Equations', 2, 'The coefficients are large', false, 1),
  ('Systems of Equations', 2, 'A variable is already isolated or easy to isolate', true, 2),
  ('Systems of Equations', 2, 'Both equations are quadratic', false, 3),
  ('Systems of Equations', 2, 'There are three variables', false, 4),

  ('Systems of Equations', 3, 'x = 6', true, 1),
  ('Systems of Equations', 3, 'x = 4', false, 2),
  ('Systems of Equations', 3, 'x = 12', false, 3),
  ('Systems of Equations', 3, 'x = 2', false, 4),

  ('Quadratic Equations', 1, 'Exactly one', false, 1),
  ('Quadratic Equations', 1, 'Typically two', true, 2),
  ('Quadratic Equations', 1, 'Always three', false, 3),
  ('Quadratic Equations', 1, 'Never any', false, 4),

  ('Quadratic Equations', 2, 'x = 2 or x = 3', false, 1),
  ('Quadratic Equations', 2, 'x = -2 or x = -3', true, 2),
  ('Quadratic Equations', 2, 'x = -1 or x = -6', false, 3),
  ('Quadratic Equations', 2, 'x = 6 only', false, 4),

  ('Quadratic Equations', 3, 'Two real solutions', false, 1),
  ('Quadratic Equations', 3, 'Exactly one real solution', false, 2),
  ('Quadratic Equations', 3, 'No real solutions', true, 3),
  ('Quadratic Equations', 3, 'Infinite solutions', false, 4),

  ('Polynomials', 1, 'Factor, Order, Isolate, List', false, 1),
  ('Polynomials', 1, 'First, Outer, Inner, Last', true, 2),
  ('Polynomials', 1, 'Find, Open, Insert, Loop', false, 3),
  ('Polynomials', 1, 'Flip, Order, Invert, Limit', false, 4),

  ('Polynomials', 2, 'Any two terms', false, 1),
  ('Polynomials', 2, 'Only like terms with the same variable and exponent', true, 2),
  ('Polynomials', 2, 'Only constants', false, 3),
  ('Polynomials', 2, 'Terms in the same equation, regardless of variable', false, 4),

  ('Polynomials', 3, '2x³ + 6x² - 8x', true, 1),
  ('Polynomials', 3, '2x² + 6x - 8', false, 2),
  ('Polynomials', 3, 'x³ + 3x² - 4x', false, 3),
  ('Polynomials', 3, '2x³ + 3x² - 4x', false, 4),

  ('Industrial Revolution', 1, 'Horses', false, 1),
  ('Industrial Revolution', 1, 'The steam engine', true, 2),
  ('Industrial Revolution', 1, 'Solar power', false, 3),
  ('Industrial Revolution', 1, 'Wind turbines', false, 4),

  ('Industrial Revolution', 2, 'People moved from cities to farms', false, 1),
  ('Industrial Revolution', 2, 'Millions moved from farms to industrial cities', true, 2),
  ('Industrial Revolution', 2, 'Population declined worldwide', false, 3),
  ('Industrial Revolution', 2, 'No population movement occurred', false, 4),

  ('Industrial Revolution', 3, 'Coal and iron', true, 1),
  ('Industrial Revolution', 3, 'Gold and silver', false, 2),
  ('Industrial Revolution', 3, 'Oil and gas', false, 3),
  ('Industrial Revolution', 3, 'Timber only', false, 4),

  ('Age of Imperialism', 1, 'Commerce, Competition, Civilizing mission', true, 1),
  ('Age of Imperialism', 1, 'Culture, Currency, Climate', false, 2),
  ('Age of Imperialism', 1, 'Conquest, Chaos, Colonization', false, 3),
  ('Age of Imperialism', 1, 'Cooperation, Charity, Community', false, 4),

  ('Age of Imperialism', 2, 'Borders matched ethnic groups perfectly', false, 1),
  ('Age of Imperialism', 2, 'Borders ignored ethnic groups, causing lasting conflicts', true, 2),
  ('Age of Imperialism', 2, 'No lasting consequences occurred', false, 3),
  ('Age of Imperialism', 2, 'All colonies became independent immediately', false, 4),

  ('Age of Imperialism', 3, 'Religious conversion only', false, 1),
  ('Age of Imperialism', 3, 'Economic gain', true, 2),
  ('Age of Imperialism', 3, 'Artistic exchange', false, 3),
  ('Age of Imperialism', 3, 'Scientific curiosity only', false, 4),

  ('World War I', 1, 'Militarism, Alliances, Imperialism, Nationalism', true, 1),
  ('World War I', 1, 'Money, Armies, Industry, Navies', false, 2),
  ('World War I', 1, 'Monarchy, Anarchy, Isolation, Neutrality', false, 3),
  ('World War I', 1, 'Migration, Agriculture, Innovation, News', false, 4),

  ('World War I', 2, 'Naval blockades only', false, 1),
  ('World War I', 2, 'Trench warfare and stalemate', true, 2),
  ('World War I', 2, 'Rapid, decisive victories', false, 3),
  ('World War I', 2, 'No fighting on the Western Front', false, 4),

  ('World War I', 3, 'Germany was rewarded with new territory', false, 1),
  ('World War I', 3, 'Heavy blame and reparations were placed on Germany', true, 2),
  ('World War I', 3, 'All countries were treated equally', false, 3),
  ('World War I', 3, 'The treaty was never signed', false, 4),

  ('Interwar Years', 1, 'The Renaissance', false, 1),
  ('Interwar Years', 1, 'The Great Depression', true, 2),
  ('Interwar Years', 1, 'The Industrial Revolution', false, 3),
  ('Interwar Years', 1, 'The Cold War', false, 4),

  ('Interwar Years', 2, 'Joseph Stalin', false, 1),
  ('Interwar Years', 2, 'Benito Mussolini', true, 2),
  ('Interwar Years', 2, 'Adolf Hitler', false, 3),
  ('Interwar Years', 2, 'Winston Churchill', false, 4),

  ('Interwar Years', 3, 'It had strong military enforcement power', false, 1),
  ('Interwar Years', 3, 'It lacked enforcement power', true, 2),
  ('Interwar Years', 3, 'It successfully stopped all aggression', false, 3),
  ('Interwar Years', 3, 'It was never actually formed', false, 4),

  ('World War II', 1, 'The invasion of Poland', false, 1),
  ('World War II', 1, 'The attack on Pearl Harbor', true, 2),
  ('World War II', 1, 'The Treaty of Versailles', false, 3),
  ('World War II', 1, 'The fall of the Berlin Wall', false, 4),

  ('World War II', 2, 'D-Day', false, 1),
  ('World War II', 2, 'Stalingrad', true, 2),
  ('World War II', 2, 'Pearl Harbor', false, 3),
  ('World War II', 2, 'Hiroshima', false, 4),

  ('World War II', 3, 'The League of Nations', false, 1),
  ('World War II', 3, 'The United Nations', true, 2),
  ('World War II', 3, 'NATO', false, 3),
  ('World War II', 3, 'The European Union', false, 4),

  ('Cold War & Beyond', 1, 'Direct combat between the US and USSR', false, 1),
  ('Cold War & Beyond', 1, 'Proxy wars, espionage, and an arms race', true, 2),
  ('Cold War & Beyond', 1, 'Formal peace treaties only', false, 3),
  ('Cold War & Beyond', 1, 'Trade agreements only', false, 4),

  ('Cold War & Beyond', 2, 'The Berlin Airlift', false, 1),
  ('Cold War & Beyond', 2, 'The Cuban Missile Crisis', true, 2),
  ('Cold War & Beyond', 2, 'The Korean War', false, 3),
  ('Cold War & Beyond', 2, 'The Vietnam War', false, 4),

  ('Cold War & Beyond', 3, 'Militarization and isolation', false, 1),
  ('Cold War & Beyond', 3, 'Glasnost and perestroika', true, 2),
  ('Cold War & Beyond', 3, 'Expansion of the Warsaw Pact', false, 3),
  ('Cold War & Beyond', 3, 'Increased censorship', false, 4)
) as x(lesson_title, question_position, option_text, is_correct, position)
on x.lesson_title = l.title and x.question_position = qq.position;

-- ============================================================
-- ECONOMY (requires supabase/migrations/002_economy.sql)
-- Re-grant rewards for any existing progress and recompute every
-- profile total authoritatively from the ledger. Idempotent — safe
-- to re-run. Note: re-running the lesson inserts above creates NEW
-- lesson rows (new ids), which orphans old progress via cascade;
-- totals are rebuilt from whatever ledger rows survive, so balances
-- never drift from history.
-- ============================================================
select public.backfill_economy();