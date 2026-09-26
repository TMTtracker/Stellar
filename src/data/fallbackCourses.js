// Static fallbacks for "Your Courses" cards.
// Used when the real courses haven't been seeded in Supabase yet, so each
// View button stays clickable and the detail page looks like other courses.
export const FALLBACK_PM_COURSE_ID = 'fallback-project-management'
export const FALLBACK_CA_COURSE_ID = 'fallback-computer-architecture'
export const FALLBACK_TOC_COURSE_ID = 'fallback-theory-of-computation'

export const FALLBACK_PM_COURSE = {
    id: FALLBACK_PM_COURSE_ID,
    title: 'Project Management',
    subject: 'Business',
    description: 'Learn how to plan, budget, schedule, and lead projects from kickoff to delivery using proven management frameworks.',
    color: '#9FCFC8',
    icon: 'BookOpen',
    estimated_hours: 5,
    isFallback: true
}

export const FALLBACK_CA_COURSE = {
    id: FALLBACK_CA_COURSE_ID,
    title: 'Computer Architecture',
    subject: 'Computer Science',
    description: 'Understand how computers really work — from logic gates and CPU cycles to memory hierarchy and parallelism.',
    color: '#B9A8E5',
    icon: 'Cpu',
    estimated_hours: 7,
    isFallback: true
}

export const FALLBACK_TOC_COURSE = {
    id: FALLBACK_TOC_COURSE_ID,
    title: 'Theory of Computation',
    subject: 'Computer Science',
    description: 'Explore automata, formal languages, computability, and complexity — what computers can and cannot do.',
    color: '#A9C8E5',
    icon: 'Code',
    estimated_hours: 6,
    isFallback: true
}

export const FALLBACK_PM_LESSONS = [
    {
        id: 'fallback-pm-lesson-1',
        course_id: FALLBACK_PM_COURSE_ID,
        title: 'What is Project Management?',
        summary: 'Core definitions, the triple constraint, and why projects fail.',
        content: 'A project is a temporary effort with a defined beginning and end that creates a unique deliverable. Every project is squeezed by scope, time, and cost — the triple constraint.',
        duration_min: 15,
        difficulty: 'Easy',
        position: 1,
        xp_reward: 40,
        coins_reward: 15,
        material_name: 'Bricks',
        material_qty: 2
    },
    {
        id: 'fallback-pm-lesson-2',
        course_id: FALLBACK_PM_COURSE_ID,
        title: 'Project Lifecycle and Phases',
        summary: 'Move through initiation, planning, execution, and closure.',
        content: 'Nearly every project moves through initiation, planning, execution, and closing. Closing gives formal sign-off, handover, and lessons learned.',
        duration_min: 18,
        difficulty: 'Easy',
        position: 2,
        xp_reward: 40,
        coins_reward: 15,
        material_name: 'Bricks',
        material_qty: 2
    },
    {
        id: 'fallback-pm-lesson-3',
        course_id: FALLBACK_PM_COURSE_ID,
        title: 'Scope and Requirements Gathering',
        summary: 'Write a scope statement and a WBS that prevents scope creep.',
        content: 'A strong scope statement lists deliverables, in-scope and out-of-scope work, acceptance criteria, and assumptions. Control creep with change control.',
        duration_min: 20,
        difficulty: 'Medium',
        position: 3,
        xp_reward: 60,
        coins_reward: 20,
        material_name: 'Timber',
        material_qty: 3
    },
    {
        id: 'fallback-pm-lesson-4',
        course_id: FALLBACK_PM_COURSE_ID,
        title: 'Scheduling and Milestones',
        summary: 'Build a critical path schedule with real dependencies.',
        content: 'A milestone is a zero-duration marker of a significant event. The critical path is the longest dependent chain and sets the minimum duration.',
        duration_min: 22,
        difficulty: 'Medium',
        position: 4,
        xp_reward: 60,
        coins_reward: 20,
        material_name: 'Timber',
        material_qty: 3
    },
    {
        id: 'fallback-pm-lesson-5',
        course_id: FALLBACK_PM_COURSE_ID,
        title: 'Risk and Budget Management',
        summary: 'Run a risk register and track budget against earned value.',
        content: 'Track description, probability, impact, owner, response, and status for every risk. CPI below 1.0 means burning money faster than earning value.',
        duration_min: 25,
        difficulty: 'Hard',
        position: 5,
        xp_reward: 90,
        coins_reward: 30,
        material_name: 'Rare gem',
        material_qty: 1
    },
    {
        id: 'fallback-pm-lesson-6',
        course_id: FALLBACK_PM_COURSE_ID,
        title: 'Agile vs Waterfall',
        summary: 'Pick the right delivery approach and run a hybrid.',
        content: 'Waterfall fits stable, well-understood work. Agile ships in short sprints. The test of Agile is short, frequent working increments.',
        duration_min: 20,
        difficulty: 'Hard',
        position: 6,
        xp_reward: 90,
        coins_reward: 30,
        material_name: 'Rare gem',
        material_qty: 1
    }
]

export const FALLBACK_CA_LESSONS = [
    {
        id: 'fallback-ca-lesson-1',
        course_id: FALLBACK_CA_COURSE_ID,
        title: 'What is Computer Architecture?',
        summary: 'Von Neumann model, ISA, and how hardware runs software.',
        content: 'Memory holds both data and instructions while a CPU fetches and executes them one at a time. The ISA is the language the CPU understands.',
        duration_min: 15,
        difficulty: 'Easy',
        position: 1,
        xp_reward: 40,
        coins_reward: 15,
        material_name: 'Bricks',
        material_qty: 2
    },
    {
        id: 'fallback-ca-lesson-2',
        course_id: FALLBACK_CA_COURSE_ID,
        title: 'Digital Logic and Gates',
        summary: 'AND, OR, NOT gates, truth tables, and combinational circuits.',
        content: 'All digital hardware is built from logic gates. Combinational output depends only on current inputs, while sequential output also uses stored state.',
        duration_min: 18,
        difficulty: 'Easy',
        position: 2,
        xp_reward: 40,
        coins_reward: 15,
        material_name: 'Bricks',
        material_qty: 2
    },
    {
        id: 'fallback-ca-lesson-3',
        course_id: FALLBACK_CA_COURSE_ID,
        title: 'CPU and Instruction Cycle',
        summary: 'Fetch-decode-execute, registers, ALU, and the control unit.',
        content: 'The CPU runs fetch, decode, execute, and store in a loop. The ALU does math, registers hold fast values, and the program counter points at the next instruction.',
        duration_min: 20,
        difficulty: 'Medium',
        position: 3,
        xp_reward: 60,
        coins_reward: 20,
        material_name: 'Timber',
        material_qty: 3
    },
    {
        id: 'fallback-ca-lesson-4',
        course_id: FALLBACK_CA_COURSE_ID,
        title: 'Memory Hierarchy',
        summary: 'Registers, cache, RAM, and virtual memory with locality.',
        content: 'No single memory is fast, large, and cheap at once. Caches exploit temporal and spatial locality; a miss must go to a slower lower level.',
        duration_min: 22,
        difficulty: 'Medium',
        position: 4,
        xp_reward: 60,
        coins_reward: 20,
        material_name: 'Timber',
        material_qty: 3
    },
    {
        id: 'fallback-ca-lesson-5',
        course_id: FALLBACK_CA_COURSE_ID,
        title: 'Input, Output and Buses',
        summary: 'Buses, interrupts, and DMA that connect CPU to devices.',
        content: 'A bus carries addresses, data, and control signals. Interrupts free the CPU from polling, and DMA moves big blocks without the CPU touching every byte.',
        duration_min: 20,
        difficulty: 'Hard',
        position: 5,
        xp_reward: 90,
        coins_reward: 30,
        material_name: 'Rare gem',
        material_qty: 1
    },
    {
        id: 'fallback-ca-lesson-6',
        course_id: FALLBACK_CA_COURSE_ID,
        title: 'Performance and Parallelism',
        summary: 'Pipelining, multicore CPUs, and Amdahl\u2019s law.',
        content: 'Pipelining overlaps instruction stages. Speedup is limited by the serial fraction: extra cores give almost no gains when little code is parallel.',
        duration_min: 25,
        difficulty: 'Hard',
        position: 6,
        xp_reward: 90,
        coins_reward: 30,
        material_name: 'Rare gem',
        material_qty: 1
    }
]

export const FALLBACK_TOC_LESSONS = [
    {
        id: 'fallback-toc-lesson-1',
        course_id: FALLBACK_TOC_COURSE_ID,
        title: 'What is Theory of Computation?',
        summary: 'Automata, computability, and complexity in one map.',
        content: 'Theory of computation asks what can be computed, how efficiently, and with what model. Automata define languages, computability draws the limits, and complexity measures cost.',
        duration_min: 15,
        difficulty: 'Easy',
        position: 1,
        xp_reward: 40,
        coins_reward: 15,
        material_name: 'Bricks',
        material_qty: 2
    },
    {
        id: 'fallback-toc-lesson-2',
        course_id: FALLBACK_TOC_COURSE_ID,
        title: 'Finite Automata',
        summary: 'DFA, NFA, and regular languages.',
        content: 'A deterministic finite automaton has exactly one move per symbol, while a nondeterministic one can have many. Both recognize exactly the regular languages.',
        duration_min: 18,
        difficulty: 'Easy',
        position: 2,
        xp_reward: 40,
        coins_reward: 15,
        material_name: 'Bricks',
        material_qty: 2
    },
    {
        id: 'fallback-toc-lesson-3',
        course_id: FALLBACK_TOC_COURSE_ID,
        title: 'Regular Expressions and Grammars',
        summary: 'Patterns, regular grammars, and context-free basics.',
        content: 'Regular expressions, finite automata, and regular grammars all describe the same class. Context-free grammars add recursion for nesting like brackets.',
        duration_min: 20,
        difficulty: 'Medium',
        position: 3,
        xp_reward: 60,
        coins_reward: 20,
        material_name: 'Timber',
        material_qty: 3
    },
    {
        id: 'fallback-toc-lesson-4',
        course_id: FALLBACK_TOC_COURSE_ID,
        title: 'Pushdown Automata and CFLs',
        summary: 'Stacks, context-free languages, and the pumping lemma.',
        content: 'A pushdown automaton adds a stack to finite control. It recognizes context-free languages, which need memory for nesting that finite automata lack.',
        duration_min: 22,
        difficulty: 'Medium',
        position: 4,
        xp_reward: 60,
        coins_reward: 20,
        material_name: 'Timber',
        material_qty: 3
    },
    {
        id: 'fallback-toc-lesson-5',
        course_id: FALLBACK_TOC_COURSE_ID,
        title: 'Turing Machines',
        summary: 'The definition, variants, and the Church-Turing thesis.',
        content: 'A Turing machine reads and writes an infinite tape. Multitape and nondeterministic variants add no power — the Church-Turing thesis says it captures all computation.',
        duration_min: 25,
        difficulty: 'Hard',
        position: 5,
        xp_reward: 90,
        coins_reward: 30,
        material_name: 'Rare gem',
        material_qty: 1
    },
    {
        id: 'fallback-toc-lesson-6',
        course_id: FALLBACK_TOC_COURSE_ID,
        title: 'Decidability and Complexity',
        summary: 'Decidable vs undecidable, P vs NP.',
        content: 'Some problems like halting are undecidable — no algorithm solves all cases. Among decidable ones, P means fast and NP-complete means likely hard.',
        duration_min: 25,
        difficulty: 'Hard',
        position: 6,
        xp_reward: 90,
        coins_reward: 30,
        material_name: 'Rare gem',
        material_qty: 1
    }
]

const FALLBACK_MAP = {
    [FALLBACK_PM_COURSE_ID]: { course: FALLBACK_PM_COURSE, lessons: FALLBACK_PM_LESSONS },
    [FALLBACK_CA_COURSE_ID]: { course: FALLBACK_CA_COURSE, lessons: FALLBACK_CA_LESSONS },
    [FALLBACK_TOC_COURSE_ID]: { course: FALLBACK_TOC_COURSE, lessons: FALLBACK_TOC_LESSONS }
}

export function isFallbackCourseId(courseId) {
    return courseId in FALLBACK_MAP
}

export function getFallbackCourse(courseId) {
    return FALLBACK_MAP[courseId] ?? null
}

// Backwards-compatible helper for the original single-course import.
export function isFallbackPmCourseId(courseId) {
    return courseId === FALLBACK_PM_COURSE_ID
}
