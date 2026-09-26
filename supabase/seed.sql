-- STELLAR Course System seed data
-- Run AFTER 001_course_system.sql in Supabase SQL Editor

-- Insert courses (id is auto; we capture ids via CTE for lessons)
with new_courses as (
  insert into public.courses (title, subject, description, color, icon, estimated_hours, is_published)
  select title, subject, description, color, icon, estimated_hours, is_published
  from (values
    ('English Reading Comprehension', 'Language', 'Master main ideas, supporting details, and evidence-based reading strategies.', '#A9D8AE', 'BookOpen', 4.5, true),
    ('Intro to Algebra', 'Mathematics', 'Build a solid foundation in algebraic thinking, from variables and expressions through to solving multi-step equations.', '#B9D1E5', 'Code', 8, true),
    ('World History: Modern Era', 'History', 'Explore the key events, movements, and ideas that shaped the modern world.', '#E5D1B9', 'MessagesSquare', 6, true),
    ('Project Management', 'Business', 'Learn how to plan, budget, schedule, and lead projects from kickoff to delivery using proven management frameworks.', '#9FCFC8', 'BookOpen', 5, true),
    ('Computer Architecture', 'Computer Science', 'Understand how computers really work — from logic gates and CPU cycles to memory hierarchy and parallelism.', '#B9A8E5', 'Cpu', 7, true),
    ('Theory of Computation', 'Computer Science', 'Explore automata, formal languages, computability, and complexity — what computers can and cannot do.', '#A9C8E5', 'Code', 6, true)
  ) as t(title, subject, description, color, icon, estimated_hours, is_published)
  where not exists (select 1 from public.courses c where c.title = t.title)
  returning id, title
),
ordered as (
  select id, title, row_number() over () as rn from new_courses
)
-- no-op select to keep CTE valid when run standalone
select * from ordered;

-- NOTE: lessons need real course ids. Run the block below after courses exist.
-- It looks up courses by title so it is idempotent-safe (delete-then-insert per course).

-- Clean existing seed lessons for these courses (safe to re-run)
delete from public.lessons where course_id in (
  select id from public.courses where title in (
    'English Reading Comprehension', 'Intro to Algebra', 'World History: Modern Era', 'Project Management', 'Computer Architecture', 'Theory of Computation'
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

-- Project Management (6 lessons)
insert into public.lessons (course_id, title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty)
select id, t.title, t.summary, t.duration_min, t.difficulty, t.position, t.xp_reward, t.coins_reward, t.material_name, t.material_qty
from public.courses c
join (values
  ('What is Project Management?', 'Core definitions, the triple constraint, and why projects fail.', 15, 'Easy', 1, 40, 15, 'Bricks', 2),
  ('Project Lifecycle and Phases', 'Move through initiation, planning, execution, and closure.', 18, 'Easy', 2, 40, 15, 'Bricks', 2),
  ('Scope and Requirements Gathering', 'Write a scope statement and a WBS that prevents scope creep.', 20, 'Medium', 3, 60, 20, 'Timber', 3),
  ('Scheduling and Milestones', 'Build a critical path schedule with real dependencies.', 22, 'Medium', 4, 60, 20, 'Timber', 3),
  ('Risk and Budget Management', 'Run a risk register and track budget against earned value.', 25, 'Hard', 5, 90, 30, 'Rare gem', 1),
  ('Agile vs Waterfall', 'Pick the right delivery approach and run a hybrid.', 20, 'Hard', 6, 90, 30, 'Rare gem', 1)
) as t(title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty)
on c.title = 'Project Management';

-- Computer Architecture (6 lessons)
insert into public.lessons (course_id, title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty)
select id, t.title, t.summary, t.duration_min, t.difficulty, t.position, t.xp_reward, t.coins_reward, t.material_name, t.material_qty
from public.courses c
join (values
  ('What is Computer Architecture?', 'Von Neumann model, ISA, and how hardware runs software.', 15, 'Easy', 1, 40, 15, 'Bricks', 2),
  ('Digital Logic and Gates', 'AND, OR, NOT gates, truth tables, and combinational circuits.', 18, 'Easy', 2, 40, 15, 'Bricks', 2),
  ('CPU and Instruction Cycle', 'Fetch-decode-execute, registers, ALU, and the control unit.', 20, 'Medium', 3, 60, 20, 'Timber', 3),
  ('Memory Hierarchy', 'Registers, cache, RAM, and virtual memory with locality.', 22, 'Medium', 4, 60, 20, 'Timber', 3),
  ('Input, Output and Buses', 'Buses, interrupts, and DMA that connect CPU to devices.', 20, 'Hard', 5, 90, 30, 'Rare gem', 1),
  ('Performance and Parallelism', 'Pipelining, multicore CPUs, and Amdahl''s law.', 25, 'Hard', 6, 90, 30, 'Rare gem', 1)
) as t(title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty)
on c.title = 'Computer Architecture';

-- Theory of Computation (6 lessons)
insert into public.lessons (course_id, title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty)
select id, t.title, t.summary, t.duration_min, t.difficulty, t.position, t.xp_reward, t.coins_reward, t.material_name, t.material_qty
from public.courses c
join (values
  ('What is Theory of Computation?', 'Automata, computability, and complexity in one map.', 15, 'Easy', 1, 40, 15, 'Bricks', 2),
  ('Finite Automata', 'DFA, NFA, and regular languages.', 18, 'Easy', 2, 40, 15, 'Bricks', 2),
  ('Regular Expressions and Grammars', 'Patterns, regular grammars, and context-free basics.', 20, 'Medium', 3, 60, 20, 'Timber', 3),
  ('Pushdown Automata and CFLs', 'Stacks, context-free languages, and the pumping lemma.', 22, 'Medium', 4, 60, 20, 'Timber', 3),
  ('Turing Machines', 'The definition, variants, and the Church-Turing thesis.', 25, 'Hard', 5, 90, 30, 'Rare gem', 1),
  ('Decidability and Complexity', 'Decidable vs undecidable, P vs NP.', 25, 'Hard', 6, 90, 30, 'Rare gem', 1)
) as t(title, summary, duration_min, difficulty, position, xp_reward, coins_reward, material_name, material_qty)
on c.title = 'Theory of Computation';

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
Think of the Cold War as a war fought through *everything except* direct combat between the two superpowers — economics, propaganda, space races, and proxy wars all substituted for a "hot" war.$md$),

  ('Project Management', 'What is Project Management?', $md$## Projects vs. everyday work

A **project** is a temporary effort with a defined beginning and end, undertaken to create a unique deliverable. That word *unique* is the key difference from routine work: building the same sandwich every day is operations, but designing a menu for a new café is a project.

**Project management** is the application of knowledge, skills, tools, and processes to project activities so a team can meet its goals.

### The triple constraint

Every project is squeezed by three linked limits, traditionally called the **triple constraint** (or iron triangle):

- **Scope** — what work gets done
- **Time** — how long you have to do it
- **Cost** — what it consumes in money and resources

Add a fourth, now common in practice: **quality**. Push on any one of these and at least one of the others must give. Agree to launch in six weeks instead of ten, and you either cut scope or cut cost — you do not get the same product for free.

### Why projects fail

Most failed projects fail for boring, preventable reasons:

- **No clear goal** — no measurable success criteria, so nobody can tell "done" from "in progress"
- **Stakeholders surprised late** — decisions made without the people who fund or use the result
- **Silent scope creep** — new requests quietly accepted without adjusting time or budget
- **No risk planning** — the first surprise becomes a crisis
- **Poor communication** — status lives in one person's head instead of a shared source of truth

### Practice tip
Before any project starts, write one sentence: *"This project succeeds when ___, measured by ___."* If you cannot fill both blanks, the project is not ready to launch.$md$),

  ('Project Management', 'Project Lifecycle and Phases', $md$## The four phases of a project

Nearly every project, no matter the industry, moves through the same four broad phases. Understanding them tells you *what kind of work is appropriate right now*.

### 1. Initiation
Deciding whether the project is worth doing at all. Typical outputs:
- A **project charter** or business case describing the problem, the goal, and the authority of the manager
- Identification of the **project sponsor** and **key stakeholders**
- A rough feasibility and high-level benefit check

### 2. Planning
The heaviest phase, and the one teams rush. It answers *how*:
- Scope definition and a **work breakdown structure (WBS)**
- Schedule, budget, and resource plan
- Risk, communication, and quality plans
- Baseline versions of scope, schedule, and cost — the reference for measuring later

### 3. Execution
Doing the work. This phase consumes most of the budget and most of the calendar:
- Direct and coordinate the people doing the tasks
- Produce the deliverables
- Manage issues, changes, and stakeholders
- Track progress against the baselines and report status

### 4. Closing
Formal acceptance and handover, which teams often forget:
- Deliver final results to the customer or sponsor
- Obtain **formal sign-off**
- Run a retrospective to capture lessons for future projects
- Release resources, archive documents, close contracts

### Key insight
Phases are **sequential in intent, not always in practice**. Planning feeds execution continuously, and closing is a real phase — skipping it is how "finished" projects stay open forever.

### Practice tip
If a project keeps skipping planning, it is usually because planning was treated as a gate to pass rather than as work that removes later rework.$md$),

  ('Project Management', 'Scope and Requirements Gathering', $md$## Scope: the boundary of the work

**Scope** is the total set of work included in the project — features, deliverables, and services. Everything not in scope is explicitly out, which is why the best scope statements are written to prevent the argument "I thought that was included."

### The scope statement
A strong project scope statement has four parts:

1. **Deliverables** — the specific, verifiable outputs ("a working checkout flow", not "a better checkout")
2. **In scope / out of scope** — an explicit list of both
3. **Acceptance criteria** — how the sponsor decides it is acceptable
4. **Assumptions and constraints** — budget, deadline, technology, staffing limits

### The Work Breakdown Structure (WBS)
A WBS is a **hierarchical decomposition** of the project into smaller, manageable pieces:

- Project → Phase → Deliverable → Work package → Task
- Rules of thumb: 100% rule (the WBS covers all the work, and only the work), 8/80 rule (no work package under 8 hours or over 80), and 100% ownership (every package has exactly one owner)

Estimating happens at the task level and rolls *up* — you never estimate a whole phase in one guess.

### Managing scope creep
**Scope creep** is uncontrolled growth of the project scope. It is usually well intentioned, which is why the fix is process, not blame:

- **Change control board (CCB)** — every proposed change gets logged, assessed for cost and schedule impact, then approved or rejected
- **A visible backlog** — new requests go to a documented list instead of into someone's head
- **Never accept free work** — every accepted change trades against time, cost, or quality

### Practice tip
Write the out-of-scope list first. It is the cheapest document you will ever write and it settles more arguments than any contract clause.$md$),

  ('Project Management', 'Scheduling and Milestones', $md$## From tasks to a schedule

A schedule is more than a list of tasks with dates. It is a network of **dependencies** that shows what can start, what must wait, and where the time actually goes.

### Key concepts
- **Milestone** — a zero-duration marker of significant event (kickoff complete, design signed off). Milestones have no duration and cost nothing, which makes them ideal progress markers.
- **Dependency types**
  - **Finish-to-start (FS)** — B starts after A finishes. The default.
  - **Start-to-start (SS)** — B starts only after A starts.
  - **Finish-to-finish (FF)** — B cannot finish until A finishes.
  - **Lag** — a deliberate delay between tasks.
- **Critical path** — the longest chain of dependent tasks through the project. It determines the minimum project duration: shorten anything on it and the project gets shorter; shorten anything off it and total duration does not change.
- **Float (slack)** — how long a task can slip before it delays the project. Critical path tasks have **zero float**.

### Estimation techniques
- **PERT / three-point estimate** — for each task give optimistic (O), most likely (M), and pessimistic (P) durations, then `(O + 4M + P) / 6`. This is far more honest than a single guess.
- **Work breakdown** — estimate the work package, not the whole project, then sum upward.

### Building the schedule
1. List activities from the WBS
2. Link them with dependencies (finish-to-start by default)
3. Assign durations and resources
4. Run the forward pass for the critical path and the backward pass for float
5. Baseline the schedule — the baseline is what "on track" is measured against

### Practice tip
A schedule with no critical path is not a schedule. If you cannot name your critical path, you do not yet know what to protect when something slips.$md$),

  ('Project Management', 'Risk and Budget Management', $md$## Risk: think ahead on purpose

A **risk** is an uncertain event that, if it happens, affects one or more project objectives — positively or negatively. Project risk management is the systematic process of identifying, analysing, and responding to risk.

### The risk register
Every project should keep a live list with, for each risk:

| Field | Purpose |
| --- | --- |
| Description | What could happen, in plain language |
| Probability | Likelihood, or exposure as Low/Medium/High |
| Impact | Consequence for scope, time, cost, quality |
| Owner | The single named person who watches it |
| Response | What you will actually do about it |
| Status | Open, mitigating, or closed |

### Four response strategies
1. **Avoid** — eliminate the risk entirely (drop the risky vendor, cancel the phase)
2. **Mitigate** — reduce probability or impact (pilot the risky piece first)
3. **Transfer** — shift the financial consequence to someone else (warranty, insurance, fixed-price contract)
4. **Accept** — consciously live with it, with a contingency reserve if the impact is high

A **contingency plan** is the "if it happens, then we do this" script — written *before* the event, never during the fire.

## Budget: planned vs. actual

The **budget** is the funds approved for the project, allocated across work packages, the **cost baseline**. Control means comparing planned value to actual spend and explaining every variance.

### Earned value basics
- **Planned Value (PV)** — what you budgeted for the work scheduled so far
- **Earned Value (EV)** — the budgeted value of work actually completed
- **Actual Cost (AC)** — what that completed work actually cost
- **Cost Variance (CV) = EV − AC** — negative means you are over budget
- **Schedule Variance (SV) = EV − PV** — negative means you are behind schedule
- **CPI = EV / AC** — below 1.0 means you are burning money faster than you earn value

### Practice tip
Review the risk register and the variances on a fixed cadence — weekly for fast-moving projects. A register that is written once at kickoff and never updated is decoration, not management.$md$),

  ('Project Management', 'Agile vs Waterfall', $md$## Two ways to sequence the work

**Waterfall** (traditional/predictive) delivers in phases: requirements → design → build → test → deploy, with each phase gated by approval before the next begins. **Agile** delivers in short cycles (sprints) of a few weeks, re-planning after each one.

| | Waterfall | Agile |
| --- | --- | --- |
| Requirements | Fixed up front, changes are costly | Evolve continuously, welcome change |
| Delivery | One big release at the end | Working increment every sprint |
| Feedback | Late, at acceptance | Early, every cycle |
| Best for | Stable, well-understood, compliance-heavy work | Uncertain, fast-moving, prioritised backlog |
| Plan | Detailed up front | Emerges, re-planned each cycle |
| Roles | Defined by department | Cross-functional team |

### The Agile core loop
Product backlog → sprint planning → sprint (usually 1–4 weeks) → review and retrospective → reprioritised backlog → next sprint.

Two Agile staples:
- **Kanban** — a visual board with columns such as To do / Doing / Done, with **WIP limits** per column to prevent pile-ups
- **Scrum** — fixed-length sprints with roles (Product Owner, Scrum Master, team), ceremonies, and a definition of done

### Choosing in practice
Most organisations use a **hybrid** approach: plan the overall roadmap and fixed milestones up front (waterfall thinking), then run sprints to deliver the parts that are still uncertain (agile thinking). The choice is driven by *how stable the requirements are*, not by which method is fashionable.

### Practice tip
A common failure is using waterfall documentation with agile delivery, or a "sprint" that lasts three months and ends in a big-bang launch. The defining test of agile is short, frequent working increments — if nothing ships until the end, it is a waterfall with extra meetings.$md$),

  ('Computer Architecture', 'What is Computer Architecture?', $md$## How hardware runs software

**Computer architecture** is the design of the parts of a computer system and how they work together. The classic **von Neumann model** still describes almost every machine you use: memory holds both data and instructions, a CPU fetches and executes them one at a time, and input/output moves data in and out.

### The big pieces
- **CPU** — executes instructions (fetch, decode, execute, store)
- **Memory** — holds programs and data being used right now
- **I/O** — keyboard, screen, disk, network, and everything around the core
- **Bus** — the wires that carry addresses, data, and control signals between them

### ISA: the contract between software and hardware
The **Instruction Set Architecture (ISA)** is the language the CPU understands — examples are x86-64, ARM, and RISC-V. Compilers translate your code into ISA instructions, and the hardware only ever sees those simple operations: move data, add numbers, compare, and jump.

### Why it matters
Every performance trick you will learn later — caching, pipelining, parallelism — exists to make this simple fetch-and-execute loop run faster without breaking what software expects.

### Practice tip
When you meet a new concept, ask: is this about the CPU, memory, I/O, or the bus between them? Placing it in the right box makes architecture far easier to remember.$md$),

  ('Computer Architecture', 'Digital Logic and Gates', $md$## From bits to circuits

All digital hardware is built from tiny switches that work with **bits** (0 and 1). **Logic gates** combine bits using the rules of Boolean algebra.

### The three basic gates
- **AND** — outputs 1 only when both inputs are 1
- **OR** — outputs 1 when at least one input is 1
- **NOT** — flips 1 to 0 and 0 to 1

From these you build **NAND**, **NOR**, **XOR**, and then larger blocks: multiplexers, decoders, adders, and finally a whole ALU.

### Truth tables
A truth table lists every input combination and the output. For example, AND:

| A | B | A AND B |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 0 |
| 1 | 0 | 0 |
| 1 | 1 | 1 |

### Combinational vs sequential
- **Combinational circuits** — output depends only on current inputs (adders, multiplexers)
- **Sequential circuits** — output depends on inputs plus stored state, using latches and flip-flops (registers, memory)

### Practice tip
Learn to read a truth table fluently: cover the output column, predict each row from the gate name, then check yourself. That skill carries straight into exams.$md$),

  ('Computer Architecture', 'CPU and Instruction Cycle', $md$## The fetch-decode-execute loop

The **CPU** runs one machine instruction at a time in a loop called the **instruction cycle**:

1. **Fetch** — the program counter (PC) points at the next instruction in memory, which is loaded into the instruction register
2. **Decode** — the control unit figures out what the instruction means and which registers it needs
3. **Execute** — the ALU or other unit performs the operation
4. **Store / write-back** — the result is written to a register or memory, and the PC moves to the next instruction

### Key parts inside the CPU
- **ALU (Arithmetic Logic Unit)** — does math and comparisons
- **Registers** — tiny, ultra-fast storage (accumulator, program counter, stack pointer, general purpose)
- **Control unit** — orchestrates data movement using control signals and a clock

### Clock speed is not everything
A 3 GHz clock ticks 3 billion times per second, but how much work finishes per tick depends on the design — instructions per cycle, pipeline depth, and stalls all matter.

### Practice tip
Trace a tiny program by hand: write down PC, registers, and memory after each step. One hand-traced loop teaches more than ten pages of reading.$md$),

  ('Computer Architecture', 'Memory Hierarchy', $md$## Fast, big, cheap — pick two

Programs want memory that is fast, large, and cheap all at once, which is impossible. The answer is a **memory hierarchy**: small fast storage at the top, large slow storage at the bottom.

From fastest/smallest to slowest/largest:
- **Registers** — inside the CPU, a few dozen values
- **L1 / L2 / L3 cache** — SRAM close to the CPU, holds recently used blocks
- **Main memory (RAM)** — DRAM, gigabytes, holds running programs
- **Storage (SSD / HDD)** — persistent, terabytes, much slower
- **Virtual memory** — the OS pretends disk is extra RAM using pages

### Why it works: locality
- **Temporal locality** — recently used data is likely to be used again
- **Spatial locality** — nearby data is likely to be used soon (loops, arrays)

Caches exploit both: a **cache hit** serves data in ~1 ns, a **miss** must go down the hierarchy and can cost 100x more.

### Practice tip
When code runs slowly, think locality first: tight loops over contiguous arrays are cache-friendly, while jumping randomly through memory causes misses.$md$),

  ('Computer Architecture', 'Input, Output and Buses', $md$## Connecting the CPU to the real world

The CPU never touches a keyboard or disk directly. Everything goes through **buses** and **I/O controllers**.

### Buses
A bus is a shared set of wires carrying:
- **Address bus** — which device or memory location
- **Data bus** — the actual bytes being moved
- **Control bus** — read, write, clock, and ready signals

Wider and faster buses move more data, but every device on the same bus can become a bottleneck.

### How I/O happens
- **Programmed I/O (polling)** — the CPU keeps asking the device "ready yet?" Simple but wasteful.
- **Interrupt-driven I/O** — the device signals the CPU only when it needs attention, so the CPU can do other work.
- **DMA (Direct Memory Access)** — a DMA controller moves big blocks (disk to RAM) without the CPU touching every byte.

### Practice tip
If a question mentions the CPU being stuck waiting on a slow device, the answer is usually interrupts or DMA — both exist to free the CPU from waiting.$md$),

  ('Computer Architecture', 'Performance and Parallelism', $md$## Making computers faster

There are only three ways to finish work faster: do each step quicker, do fewer steps, or do more steps at once. Modern architecture leans hard on the third one.

### Pipelining
Like an assembly line, **pipelining** overlaps fetch, decode, execute, memory, and write-back for several instructions at once. Hazards — data, control (branches), and structural conflicts — cause stalls and bubbles.

### Parallelism levels
- **Instruction-level (ILP)** — superscalar execution, out-of-order execution
- **Data-level** — SIMD / vector units doing the same operation on many values
- **Thread-level** — multicore CPUs and simultaneous multithreading

### Amdahl''s law
If only part of a program can be parallelized, speedup is limited. Speedup = 1 / ((1 - P) + P / N), where P is the parallel fraction and N is the number of processors. A program that is 50% parallel barely benefits past a few cores.

### Practice tip
Before adding cores, find P first. If P is small, optimizing the serial part beats buying more parallelism every time.$md$),

  ('Theory of Computation', 'What is Theory of Computation?', $md$## What can be computed?

**Theory of computation** maps the limits of computing through three branches: **automata** (models of machines), **computability** (what can be solved at all), and **complexity** (what can be solved efficiently).

Start with the Chomsky hierarchy: regular < context-free < context-sensitive < recursively enumerable. Each level adds power and cost.

### Practice tip
Place every new model on this ladder first — exam questions love asking which level a language belongs to.$md$),

  ('Theory of Computation', 'Finite Automata', $md$## DFA vs NFA

A **DFA** has exactly one transition per symbol per state. An **NFA** can have zero, one, or many — plus empty moves. Surprisingly, both recognize exactly the **regular languages**.

Convert NFA to DFA with subset construction, then minimize. If a language needs unbounded counting, no finite automaton can do it.

### Practice tip
To prove non-regularity, reach for the pumping lemma: all long strings in a regular language can be pumped.$md$),

  ('Theory of Computation', 'Regular Expressions and Grammars', $md$## Three faces of regular

**Regular expressions**, **finite automata**, and **regular grammars** all describe the same class. Add recursion and you step up to **context-free grammars** for nesting like brackets and expressions.

Derivations build parse trees; ambiguity means two trees for one string — bad news for compilers.

### Practice tip
When a grammar has nesting or matching pairs, think context-free, not regular.$md$),

  ('Theory of Computation', 'Pushdown Automata and CFLs', $md$## Adding a stack

A **pushdown automaton** is finite control plus a stack. That single stack unlocks **context-free languages**: balanced parentheses, arithmetic expressions, and most programming syntax.

The pumping lemma for CFLs pumps two substrings at once. Languages needing two independent counts (like a^n b^n c^n) escape even this level.

### Practice tip
One stack = one kind of nesting. Two independent counts need more power.$md$),

  ('Theory of Computation', 'Turing Machines', $md$## The ultimate model

A **Turing machine** reads and writes an infinite tape with finite control. Multitape, nondeterministic, and enumerator variants all have equal power — the **Church-Turing thesis** says this captures all computation.

Universal machines simulate any other machine from its description — the idea behind stored-program computers.

### Practice tip
If it is computable at all, some Turing machine computes it. Variants change convenience, never power.$md$),

  ('Theory of Computation', 'Decidability and Complexity', $md$## Decidable, hard, impossible

**Decidable** means some Turing machine always halts with the right answer. The **halting problem** is undecidable — no algorithm solves all cases.

Among decidable problems, **P** means solvable fast and **NP-complete** means likely hard: a fast solution to one gives fast solutions to all NP problems.

### Practice tip
First ask decidable or not, then ask fast or hard. Mixing the two levels is the classic exam trap.$md$)
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
  where c.title in ('English Reading Comprehension', 'Intro to Algebra', 'World History: Modern Era', 'Project Management', 'Computer Architecture', 'Theory of Computation')
);

insert into public.quizzes (lesson_id, title, passing_score, xp_reward, coins_reward)
select l.id, 'Quiz: ' || l.title, 70, 20, 10
from public.lessons l
join public.courses c on c.id = l.course_id
where c.title in ('English Reading Comprehension', 'Intro to Algebra', 'World History: Modern Era', 'Project Management', 'Computer Architecture', 'Theory of Computation');

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
  ('Cold War & Beyond', 'What reforms did Mikhail Gorbachev introduce that contributed to the Cold War''s end?', 'Gorbachev''s reforms of glasnost (openness) and perestroika (restructuring) contributed to the Soviet Union''s collapse.', 3),

  ('What is Project Management?', 'What is a project?', 'A project is a temporary effort with a defined beginning and end that creates a unique deliverable.', 1),
  ('What is Project Management?', 'What are the three limits in the triple constraint?', 'Scope, time, and cost are the three linked limits of the triple constraint, plus quality in modern practice.', 2),
  ('What is Project Management?', 'Which is a common reason projects fail?', 'Silent scope creep, unclear goals, and poor communication are classic preventable causes of failure.', 3),

  ('Project Lifecycle and Phases', 'What are the four phases of a project?', 'Initiation, planning, execution, and closing are the four broad phases of nearly every project.', 1),
  ('Project Lifecycle and Phases', 'What is produced during initiation?', 'A project charter or business case plus sponsor and stakeholder identification comes out of initiation.', 2),
  ('Project Lifecycle and Phases', 'Why is closing a real phase?', 'Closing gives formal sign-off, handover, retrospectives, and archiving — skipping it leaves projects open forever.', 3),

  ('Scope and Requirements Gathering', 'What does a strong scope statement include?', 'Deliverables, in-scope/out-of-scope lists, acceptance criteria, and assumptions make a strong scope statement.', 1),
  ('Scope and Requirements Gathering', 'What is a WBS?', 'A work breakdown structure hierarchically decomposes the project into phases, deliverables, work packages, and tasks.', 2),
  ('Scope and Requirements Gathering', 'How do you control scope creep?', 'Log every change, assess cost and schedule impact, and approve or reject via change control.', 3),

  ('Scheduling and Milestones', 'What is a milestone?', 'A milestone is a zero-duration marker of a significant event, ideal for tracking progress.', 1),
  ('Scheduling and Milestones', 'What is the critical path?', 'The critical path is the longest chain of dependent tasks and determines the minimum project duration.', 2),
  ('Scheduling and Milestones', 'What is float (slack)?', 'Float is how long a task can slip before delaying the project; critical path tasks have zero float.', 3),

  ('Risk and Budget Management', 'What fields belong in a risk register?', 'Description, probability, impact, owner, response, and status belong in a risk register.', 1),
  ('Risk and Budget Management', 'What does CPI below 1.0 mean?', 'CPI equals earned value divided by actual cost, so below 1.0 means burning money faster than earning value.', 2),
  ('Risk and Budget Management', 'Which is a risk response strategy?', 'Avoid, mitigate, transfer, and accept are the four standard risk response strategies.', 3),

  ('Agile vs Waterfall', 'When is Waterfall a better fit than Agile?', 'Waterfall fits stable, well-understood, compliance-heavy work with fixed requirements up front.', 1),
  ('Agile vs Waterfall', 'What is the Agile core loop?', 'Backlog, sprint planning, sprint, review and retrospective, then a reprioritised backlog for the next sprint.', 2),
  ('Agile vs Waterfall', 'What is the defining test of Agile?', 'Short, frequent working increments ship every sprint — otherwise it is Waterfall with extra meetings.', 3),

  ('What is Computer Architecture?', 'What describes the von Neumann model?', 'Memory holds both data and instructions while a CPU fetches and executes them one at a time.', 1),
  ('What is Computer Architecture?', 'What is an ISA?', 'The instruction set architecture is the language the CPU understands, such as x86-64, ARM, or RISC-V.', 2),
  ('What is Computer Architecture?', 'What are the four big pieces of a computer system?', 'CPU, memory, I/O, and the bus connecting them are the four big architectural pieces.', 3),

  ('Digital Logic and Gates', 'What does an AND gate output?', 'An AND gate outputs 1 only when both inputs are 1.', 1),
  ('Digital Logic and Gates', 'What is a truth table?', 'A truth table lists every input combination of a gate or circuit and its output.', 2),
  ('Digital Logic and Gates', 'What is the difference between combinational and sequential circuits?', 'Combinational output depends only on current inputs, while sequential output also depends on stored state.', 3),

  ('CPU and Instruction Cycle', 'What are the steps of the instruction cycle?', 'Fetch, decode, execute, and store/write-back make up the instruction cycle.', 1),
  ('CPU and Instruction Cycle', 'What does the ALU do?', 'The ALU performs arithmetic and comparison operations inside the CPU.', 2),
  ('CPU and Instruction Cycle', 'What does the program counter do?', 'The program counter points at the next instruction in memory to fetch.', 3),

  ('Memory Hierarchy', 'Why does the memory hierarchy exist?', 'No single memory is fast, large, and cheap at once, so layers combine small-fast and large-slow storage.', 1),
  ('Memory Hierarchy', 'What is temporal locality?', 'Temporal locality means recently used data is likely to be used again soon.', 2),
  ('Memory Hierarchy', 'What happens on a cache miss?', 'On a miss the data must be fetched from a lower, slower level of the hierarchy.', 3),

  ('Input, Output and Buses', 'What three things does a bus carry?', 'A bus carries addresses, data, and control signals between CPU, memory, and devices.', 1),
  ('Input, Output and Buses', 'Why are interrupts better than polling?', 'Interrupts let the CPU do other work until a device needs attention instead of constantly asking.', 2),
  ('Input, Output and Buses', 'What is DMA?', 'Direct memory access moves big blocks such as disk to RAM without the CPU touching every byte.', 3),

  ('Performance and Parallelism', 'What is pipelining?', 'Pipelining overlaps fetch, decode, execute, memory, and write-back for several instructions at once.', 1),
  ('Performance and Parallelism', 'What does Amdahl''s law describe?', 'Amdahl''s law limits speedup by the serial fraction: 1 divided by ((1 - P) + P / N).', 2),
  ('Performance and Parallelism', 'If only 50% of a program is parallel, what happens with many cores?', 'The serial half dominates, so adding cores past a few gives almost no extra speedup.', 3)
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
  ('Cold War & Beyond', 3, 'Increased censorship', false, 4),

  ('What is Project Management?', 1, 'Routine daily work with no end date', false, 1),
  ('What is Project Management?', 1, 'A temporary effort creating a unique deliverable', true, 2),
  ('What is Project Management?', 1, 'A permanent department', false, 3),
  ('What is Project Management?', 1, 'A single meeting', false, 4),

  ('What is Project Management?', 2, 'Scope, time, and cost', true, 1),
  ('What is Project Management?', 2, 'People, paper, and pens', false, 2),
  ('What is Project Management?', 2, 'Plan, meeting, and email', false, 3),
  ('What is Project Management?', 2, 'Risk, reward, and luck', false, 4),

  ('What is Project Management?', 3, 'Too much funding', false, 1),
  ('What is Project Management?', 3, 'Silent scope creep and unclear goals', true, 2),
  ('What is Project Management?', 3, 'Too much communication', false, 3),
  ('What is Project Management?', 3, 'Finishing too early', false, 4),

  ('Project Lifecycle and Phases', 1, 'Start, middle, end', false, 1),
  ('Project Lifecycle and Phases', 1, 'Initiation, planning, execution, closing', true, 2),
  ('Project Lifecycle and Phases', 1, 'Idea, lunch, launch', false, 3),
  ('Project Lifecycle and Phases', 1, 'Design only', false, 4),

  ('Project Lifecycle and Phases', 2, 'A finished product', false, 1),
  ('Project Lifecycle and Phases', 2, 'A project charter and stakeholder list', true, 2),
  ('Project Lifecycle and Phases', 2, 'A final invoice', false, 3),
  ('Project Lifecycle and Phases', 2, 'A retrospective only', false, 4),

  ('Project Lifecycle and Phases', 3, 'It is optional paperwork', false, 1),
  ('Project Lifecycle and Phases', 3, 'It gives sign-off, handover, and lessons learned', true, 2),
  ('Project Lifecycle and Phases', 3, 'It starts the project', false, 3),
  ('Project Lifecycle and Phases', 3, 'It replaces planning', false, 4),

  ('Scope and Requirements Gathering', 1, 'Only a deadline', false, 1),
  ('Scope and Requirements Gathering', 1, 'Deliverables, in/out of scope, acceptance criteria, assumptions', true, 2),
  ('Scope and Requirements Gathering', 1, 'A list of team birthdays', false, 3),
  ('Scope and Requirements Gathering', 1, 'A budget with no details', false, 4),

  ('Scope and Requirements Gathering', 2, 'A meeting agenda', false, 1),
  ('Scope and Requirements Gathering', 2, 'A hierarchical decomposition of all project work', true, 2),
  ('Scope and Requirements Gathering', 2, 'A vacation schedule', false, 3),
  ('Scope and Requirements Gathering', 2, 'A risk list only', false, 4),

  ('Scope and Requirements Gathering', 3, 'Accept every request immediately', false, 1),
  ('Scope and Requirements Gathering', 3, 'Log, assess impact, then approve or reject via change control', true, 2),
  ('Scope and Requirements Gathering', 3, 'Ignore all new requests', false, 3),
  ('Scope and Requirements Gathering', 3, 'Double the budget every time', false, 4),

  ('Scheduling and Milestones', 1, 'A long task that costs money', false, 1),
  ('Scheduling and Milestones', 1, 'A zero-duration marker of a significant event', true, 2),
  ('Scheduling and Milestones', 1, 'A weekly status email', false, 3),
  ('Scheduling and Milestones', 1, 'A budget spreadsheet', false, 4),

  ('Scheduling and Milestones', 2, 'The shortest task in the project', false, 1),
  ('Scheduling and Milestones', 2, 'The longest dependent chain determining minimum duration', true, 2),
  ('Scheduling and Milestones', 2, 'A list of all meetings', false, 3),
  ('Scheduling and Milestones', 2, 'The project budget', false, 4),

  ('Scheduling and Milestones', 3, 'The cost of a task', false, 1),
  ('Scheduling and Milestones', 3, 'How long a task can slip before delaying the project', true, 2),
  ('Scheduling and Milestones', 3, 'The number of people on a task', false, 3),
  ('Scheduling and Milestones', 3, 'The priority of a task', false, 4),

  ('Risk and Budget Management', 1, 'Only a title and date', false, 1),
  ('Risk and Budget Management', 1, 'Description, probability, impact, owner, response, status', true, 2),
  ('Risk and Budget Management', 1, 'Names and phone numbers only', false, 3),
  ('Risk and Budget Management', 1, 'Budget numbers only', false, 4),

  ('Risk and Budget Management', 2, 'You are ahead of schedule', false, 1),
  ('Risk and Budget Management', 2, 'You are burning money faster than earning value', true, 2),
  ('Risk and Budget Management', 2, 'You are under budget', false, 3),
  ('Risk and Budget Management', 2, 'Nothing about cost', false, 4),

  ('Risk and Budget Management', 3, 'Ignore, hope, delay, panic', false, 1),
  ('Risk and Budget Management', 3, 'Avoid, mitigate, transfer, accept', true, 2),
  ('Risk and Budget Management', 3, 'Plan, build, test, deploy', false, 3),
  ('Risk and Budget Management', 3, 'Start, stop, continue, repeat', false, 4),

  ('Agile vs Waterfall', 1, 'Fast-moving work with changing requirements', false, 1),
  ('Agile vs Waterfall', 1, 'Stable, well-understood, compliance-heavy work', true, 2),
  ('Agile vs Waterfall', 1, 'A tiny prototype with one user', false, 3),
  ('Agile vs Waterfall', 1, 'Never a good fit', false, 4),

  ('Agile vs Waterfall', 2, 'Design, build, test once at the end', false, 1),
  ('Agile vs Waterfall', 2, 'Backlog, sprint planning, sprint, review, retrospective', true, 2),
  ('Agile vs Waterfall', 2, 'Kickoff, lunch, launch', false, 3),
  ('Agile vs Waterfall', 2, 'Write docs and stop', false, 4),

  ('Agile vs Waterfall', 3, 'Daily standup meetings', false, 1),
  ('Agile vs Waterfall', 3, 'Short, frequent working increments shipping each sprint', true, 2),
  ('Agile vs Waterfall', 3, 'A fancy board tool', false, 3),
  ('Agile vs Waterfall', 3, 'Calling the project Agile', false, 4),

  ('What is Computer Architecture?', 1, 'A programming language', false, 1),
  ('What is Computer Architecture?', 1, 'Memory holding data plus CPU fetching and executing instructions', true, 2),
  ('What is Computer Architecture?', 1, 'A type of monitor', false, 3),
  ('What is Computer Architecture?', 1, 'An operating system', false, 4),

  ('What is Computer Architecture?', 2, 'A CPU brand name', false, 1),
  ('What is Computer Architecture?', 2, 'The language the CPU understands, like ARM or x86-64', true, 2),
  ('What is Computer Architecture?', 2, 'A compiler setting', false, 3),
  ('What is Computer Architecture?', 2, 'A cable type', false, 4),

  ('What is Computer Architecture?', 3, 'Keyboard, mouse, printer, speaker', false, 1),
  ('What is Computer Architecture?', 3, 'CPU, memory, I/O, and bus', true, 2),
  ('What is Computer Architecture?', 3, 'HTML, CSS, JavaScript, SQL', false, 3),
  ('What is Computer Architecture?', 3, 'File, folder, app, window', false, 4),

  ('Digital Logic and Gates', 1, '1 only when both inputs are 1', true, 1),
  ('Digital Logic and Gates', 1, '1 when any input is 0', false, 2),
  ('Digital Logic and Gates', 1, 'Always 0', false, 3),
  ('Digital Logic and Gates', 1, 'Always 1', false, 4),

  ('Digital Logic and Gates', 2, 'A list of every input combination and its output', true, 1),
  ('Digital Logic and Gates', 2, 'A timetable for the CPU', false, 2),
  ('Digital Logic and Gates', 2, 'A multiplication chart', false, 3),
  ('Digital Logic and Gates', 2, 'A list of passwords', false, 4),

  ('Digital Logic and Gates', 3, 'They are exactly the same', false, 1),
  ('Digital Logic and Gates', 3, 'Combinational depends only on inputs; sequential also uses stored state', true, 2),
  ('Digital Logic and Gates', 3, 'Sequential is always faster', false, 3),
  ('Digital Logic and Gates', 3, 'Combinational uses memory cells', false, 4),

  ('CPU and Instruction Cycle', 1, 'Boot, login, shutdown', false, 1),
  ('CPU and Instruction Cycle', 1, 'Fetch, decode, execute, store', true, 2),
  ('CPU and Instruction Cycle', 1, 'Read, write, delete', false, 3),
  ('CPU and Instruction Cycle', 1, 'Compile, link, run', false, 4),

  ('CPU and Instruction Cycle', 2, 'Stores files permanently', false, 1),
  ('CPU and Instruction Cycle', 2, 'Performs arithmetic and comparisons', true, 2),
  ('CPU and Instruction Cycle', 2, 'Displays graphics', false, 3),
  ('CPU and Instruction Cycle', 2, 'Connects to Wi-Fi', false, 4),

  ('CPU and Instruction Cycle', 3, 'Counts clock ticks only', false, 1),
  ('CPU and Instruction Cycle', 3, 'Points at the next instruction to fetch', true, 2),
  ('CPU and Instruction Cycle', 3, 'Stores the final result', false, 3),
  ('CPU and Instruction Cycle', 3, 'Powers off the CPU', false, 4),

  ('Memory Hierarchy', 1, 'Engineers enjoy complexity', false, 1),
  ('Memory Hierarchy', 1, 'No single memory is fast, large, and cheap at once', true, 2),
  ('Memory Hierarchy', 1, 'CPUs cannot access RAM directly', false, 3),
  ('Memory Hierarchy', 1, 'Disks are faster than registers', false, 4),

  ('Memory Hierarchy', 2, 'Nearby data is likely to be used soon', false, 1),
  ('Memory Hierarchy', 2, 'Recently used data is likely to be used again', true, 2),
  ('Memory Hierarchy', 2, 'Old data is never reused', false, 3),
  ('Memory Hierarchy', 2, 'Cache is always empty', false, 4),

  ('Memory Hierarchy', 3, 'Data is served instantly from cache', false, 1),
  ('Memory Hierarchy', 3, 'Data must be fetched from a slower lower level', true, 2),
  ('Memory Hierarchy', 3, 'The program crashes', false, 3),
  ('Memory Hierarchy', 3, 'Nothing happens', false, 4),

  ('Input, Output and Buses', 1, 'Power, ground, and clock only', false, 1),
  ('Input, Output and Buses', 1, 'Addresses, data, and control signals', true, 2),
  ('Input, Output and Buses', 1, 'Files, folders, and apps', false, 3),
  ('Input, Output and Buses', 1, 'Red, green, and blue wires', false, 4),

  ('Input, Output and Buses', 2, 'Polling uses less power', false, 1),
  ('Input, Output and Buses', 2, 'The CPU can do other work until the device signals', true, 2),
  ('Input, Output and Buses', 2, 'Interrupts are slower always', false, 3),
  ('Input, Output and Buses', 2, 'Polling needs no CPU', false, 4),

  ('Input, Output and Buses', 3, 'A faster CPU clock', false, 1),
  ('Input, Output and Buses', 3, 'Moving big blocks without the CPU touching every byte', true, 2),
  ('Input, Output and Buses', 3, 'A new bus cable', false, 3),
  ('Input, Output and Buses', 3, 'A device driver update', false, 4),

  ('Performance and Parallelism', 1, 'Running the CPU at a higher voltage', false, 1),
  ('Performance and Parallelism', 1, 'Overlapping fetch, decode, execute for several instructions at once', true, 2),
  ('Performance and Parallelism', 1, 'Adding more RAM', false, 3),
  ('Performance and Parallelism', 1, 'Deleting old files', false, 4),

  ('Performance and Parallelism', 2, 'Bigger caches always double speed', false, 1),
  ('Performance and Parallelism', 2, 'Speedup is limited by the serial fraction of the program', true, 2),
  ('Performance and Parallelism', 2, 'More cores always give linear speedup', false, 3),
  ('Performance and Parallelism', 2, 'Clock speed no longer matters', false, 4),

  ('Performance and Parallelism', 3, 'It runs twice as fast', false, 1),
  ('Performance and Parallelism', 3, 'Extra cores give almost no additional speedup', true, 2),
  ('Performance and Parallelism', 3, 'It cannot run at all', false, 3),
  ('Performance and Parallelism', 3, 'Memory usage drops to zero', false, 4)
) as x(lesson_title, question_position, option_text, is_correct, position)
on x.lesson_title = l.title and x.question_position = qq.position;