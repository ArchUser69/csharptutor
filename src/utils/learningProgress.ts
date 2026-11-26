import type {
  ChatMessage,
  ChatSession,
  CodePreset,
  CSharpTopic,
  Difficulty,
  LearningProgress,
  PracticeExercise,
  QuizQuestion,
} from '../types/tutor';

export const CSHARP_TOPICS: CSharpTopic[] = [
  'Fundamentals & Types',
  'OOP & Interfaces',
  'LINQ & Collections',
  'Async & Concurrency',
  'Nullability & Errors',
  'Modern C# (Records & Patterns)',
];

export const CODE_PRESETS: CodePreset[] = [
  {
    id: 'null-bug',
    label: 'NullReference Bug',
    difficulty: 'beginner',
    description: 'Find why printing a user display name throws at runtime.',
    code: `using System;
using System.Collections.Generic;

public class UserProfile
{
    public string Name { get; set; }
    public string? Bio { get; set; }
}

public class Program
{
    public static void Main()
    {
        var profiles = new List<UserProfile?>
        {
            new UserProfile { Name = "Ada", Bio = "C# pioneer" },
            null
        };

        foreach (var profile in profiles)
        {
            Console.WriteLine(profile.Name.ToUpper());
        }
    }
}`,
  },
  {
    id: 'linq-pipeline',
    label: 'LINQ Deferred Execution',
    difficulty: 'intermediate',
    description: 'Inspect how LINQ queries compose and materialize sequences.',
    code: `using System;
using System.Collections.Generic;
using System.Linq;

record Order(string Id, decimal Total, bool IsPaid);

var orders = new List<Order>
{
    new("ORD-101", 49.50m, true),
    new("ORD-102", 120.00m, false),
    new("ORD-103", 85.25m, true),
};

var paidTotals = orders
    .Where(o => o.IsPaid)
    .OrderByDescending(o => o.Total)
    .Select(o => $"{o.Id}: {o.Total:C}");

foreach (var line in paidTotals)
{
    Console.WriteLine(line);
}`,
  },
  {
    id: 'async-pitfall',
    label: 'Async/Await Pitfall',
    difficulty: 'advanced',
    description: 'Debug an async method with fire-and-forget and blocking calls.',
    code: `using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public class PriceService
{
    public async Task<decimal> FetchTotalAsync(IEnumerable<string> skus)
    {
        decimal total = 0m;
        foreach (var sku in skus)
        {
            total += GetPriceAsync(sku).Result;
        }
        return total;
    }

    private async void LogLookup(string sku)
    {
        await Task.Delay(50);
        throw new InvalidOperationException($"Log failed for {sku}");
    }

    private async Task<decimal> GetPriceAsync(string sku)
    {
        LogLookup(sku);
        await Task.Delay(25);
        return sku.Length * 10m;
    }
}`,
  },
  {
    id: 'pattern-matching',
    label: 'Records & Patterns',
    difficulty: 'intermediate',
    description: 'Explore C# switch expressions with positional and property patterns.',
    code: `using System;

public abstract record ShippingTier;
public record Standard(decimal WeightKg) : ShippingTier;
public record Express(decimal WeightKg, bool Fragile) : ShippingTier;

public static class ShippingCalculator
{
    public static decimal CalculateCost(ShippingTier tier) => tier switch
    {
        Standard(<= 2m) => 5.00m,
        Standard(var w) => 5.00m + (w - 2m) * 1.50m,
        Express(var w, true) => 15.00m + w * 3.00m,
        Express(var w, false) => 10.00m + w * 2.25m,
        _ => throw new ArgumentOutOfRangeException(nameof(tier))
    };
}`,
  },
];

export const STARTER_PROMPTS: Record<Difficulty, string[]> = {
  beginner: [
    'What is the difference between value types (struct/int) and reference types (class/string) in C#?',
    'How does foreach work under the hood, and when should I use a for loop instead?',
    'Explain nullable reference types (string?) and why C# warns about null.',
    'How do I build a clean Console app using top-level statements in modern C#?',
  ],
  intermediate: [
    'Why does LINQ use deferred execution, and when should I call .ToList()?',
    'When should I choose a C# record instead of a class or struct?',
    'How do switch expressions and pattern matching replace nested if/else chains?',
    'Explain dependency injection with interfaces in .NET using a small C# example.',
  ],
  advanced: [
    'Why is async void dangerous outside event handlers, and how does SynchronizationContext behave?',
    'When should I use Span<T> and stackalloc instead of allocating arrays on the heap?',
    'Explain Task.WhenAll vs sequential await in loops and how exceptions aggregate.',
    'How do covariance (out T) and contravariance (in T) work in C# generic interfaces?',
  ],
};

export const STARTER_EXERCISES: Record<Difficulty, PracticeExercise> = {
  beginner: {
    id: 'starter-beginner-grade-filter',
    title: 'Filter Passing Exam Scores',
    difficulty: 'beginner',
    topic: 'Fundamentals & Types',
    prompt:
      'Write a C# static method CountPassingScores that accepts an int[] of scores and an int passingThreshold, returning how many scores are greater than or equal to the threshold. Handle null or empty arrays safely by returning 0.',
    requirements: [
      'Return 0 if scores is null or empty.',
      'Count elements where score >= passingThreshold.',
      'Keep the method signature public static int CountPassingScores(int[]? scores, int passingThreshold).',
    ],
    starterCode: `using System;

public static class GradeAnalyzer
{
    public static int CountPassingScores(int[]? scores, int passingThreshold)
    {
        // TODO: Guard against null, loop through scores, and count passing ones
        return 0;
    }
}`,
    hints: [
      'Start with a null guard: if (scores is null || scores.Length == 0) return 0;',
      'Initialize an int count = 0; variable and iterate using foreach (int score in scores).',
      'Inside the loop, check if (score >= passingThreshold) and increment count.',
    ],
    solutionCode: `using System;

public static class GradeAnalyzer
{
    public static int CountPassingScores(int[]? scores, int passingThreshold)
    {
        if (scores is null || scores.Length == 0)
        {
            return 0;
        }

        int count = 0;
        foreach (int score in scores)
        {
            if (score >= passingThreshold)
            {
                count++;
            }
        }

        return count;
    }
}`,
    isStarter: true,
  },
  intermediate: {
    id: 'starter-intermediate-linq-grouping',
    title: 'Summarize Sales by Category with LINQ',
    difficulty: 'intermediate',
    topic: 'LINQ & Collections',
    prompt:
      'Implement SummarizeByCategory using LINQ so it groups Sale records by Category (case-insensitive) and returns a Dictionary<string, decimal> mapping each category name to its total revenue.',
    requirements: [
      'Group items using StringComparer.OrdinalIgnoreCase.',
      'Sum Amount values for each category.',
      'Return an empty dictionary if sales is empty.',
    ],
    starterCode: `using System;
using System.Collections.Generic;
using System.Linq;

public record Sale(string Category, decimal Amount);

public static class SalesReport
{
    public static Dictionary<string, decimal> SummarizeByCategory(IEnumerable<Sale> sales)
    {
        // TODO: Group by Category and sum Amount into a Dictionary
        return new Dictionary<string, decimal>();
    }
}`,
    hints: [
      'Use sales.GroupBy(s => s.Category, StringComparer.OrdinalIgnoreCase).',
      'Project each group into a Dictionary with .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount), StringComparer.OrdinalIgnoreCase).',
      'Consider guarding against null input with ArgumentNullException.ThrowIfNull(sales).',
    ],
    solutionCode: `using System;
using System.Collections.Generic;
using System.Linq;

public record Sale(string Category, decimal Amount);

public static class SalesReport
{
    public static Dictionary<string, decimal> SummarizeByCategory(IEnumerable<Sale> sales)
    {
        ArgumentNullException.ThrowIfNull(sales);

        return sales
            .GroupBy(s => s.Category, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(s => s.Amount),
                StringComparer.OrdinalIgnoreCase);
    }
}`,
    isStarter: true,
  },
  advanced: {
    id: 'starter-advanced-async-whenall',
    title: 'Bounded Concurrent Fetching with Cancellation',
    difficulty: 'advanced',
    topic: 'Async & Concurrency',
    prompt:
      'Complete FetchAllAsync so it fetches items concurrently using Task.WhenAll while respecting CancellationToken, and never uses async void or .Result.',
    requirements: [
      'Project each id into a Task<string> via fetcher(id, ct).',
      'Await all tasks cleanly with Task.WhenAll.',
      'Respect cancellation by passing ct to the delegate and checking ThrowIfCancellationRequested.',
    ],
    starterCode: `using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

public static class BatchFetcher
{
    public static async Task<IReadOnlyList<string>> FetchAllAsync(
        IEnumerable<string> ids,
        Func<string, CancellationToken, Task<string>> fetcher,
        CancellationToken ct = default)
    {
        // TODO: Validate inputs, project tasks, and await Task.WhenAll
        return Array.Empty<string>();
    }
}`,
    hints: [
      'Validate ids and fetcher with ArgumentNullException.ThrowIfNull and call ct.ThrowIfCancellationRequested().',
      'Create an array or list of tasks: var tasks = ids.Select(id => fetcher(id, ct)).ToArray();',
      'Return await Task.WhenAll(tasks).ConfigureAwait(false);',
    ],
    solutionCode: `using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

public static class BatchFetcher
{
    public static async Task<IReadOnlyList<string>> FetchAllAsync(
        IEnumerable<string> ids,
        Func<string, CancellationToken, Task<string>> fetcher,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(ids);
        ArgumentNullException.ThrowIfNull(fetcher);
        ct.ThrowIfCancellationRequested();

        Task<string>[] tasks = ids.Select(id => fetcher(id, ct)).ToArray();
        return await Task.WhenAll(tasks).ConfigureAwait(false);
    }
}`,
    isStarter: true,
  },
};

export const STARTER_QUIZZES: Record<Difficulty, QuizQuestion[]> = {
  beginner: [
    {
      id: 'q-beg-1',
      topic: 'Fundamentals & Types',
      question: 'What is the output of this C# snippet?',
      codeSnippet: `int a = 5;
int b = a;
b = 10;
Console.WriteLine(a);`,
      options: ['5', '10', '0', 'Compile-time error'],
      correctIndex: 0,
      explanation:
        'int is a value type (struct). Assigning b = a copies the value 5, so modifying b does not change a.',
    },
    {
      id: 'q-beg-2',
      topic: 'Nullability & Errors',
      question: 'Which operator provides a fallback value when the left-hand expression is null?',
      options: ['?? (null-coalescing)', '=> (lambda)', ':: (namespace alias)', '?: (ternary)'],
      correctIndex: 0,
      explanation:
        'The ?? operator returns the left operand if it is non-null; otherwise it evaluates and returns the right operand.',
    },
    {
      id: 'q-beg-3',
      topic: 'Fundamentals & Types',
      question: 'Which keyword lets C# infer a local variable’s static type at compile time?',
      options: ['dynamic', 'var', 'object', 'auto'],
      correctIndex: 1,
      explanation:
        'var is strongly and statically typed at compile time based on the initializer expression, unlike dynamic.',
    },
  ],
  intermediate: [
    {
      id: 'q-int-1',
      topic: 'LINQ & Collections',
      question: 'What does this C# code print?',
      codeSnippet: `var numbers = new List<int> { 1, 2, 3 };
var query = numbers.Where(n => n > 1);
numbers.Add(4);
Console.WriteLine(query.Count());`,
      options: ['2', '3', '4', 'InvalidOperationException'],
      correctIndex: 1,
      explanation:
        'LINQ Where uses deferred execution. Adding 4 happens before Count() iterates the query, so {2, 3, 4} match (count = 3).',
    },
    {
      id: 'q-int-2',
      topic: 'Modern C# (Records & Patterns)',
      question: 'How do two C# record class instances compare with == by default?',
      options: [
        'By reference identity only',
        'By value-based equality of all public properties',
        'Records do not support ==',
        'By ToString() comparison',
      ],
      correctIndex: 1,
      explanation:
        'C# records synthesize value-based Equals, GetHashCode, ==, and != comparing their properties.',
    },
    {
      id: 'q-int-3',
      topic: 'OOP & Interfaces',
      question: 'Which statement about C# interfaces (C# 8+) is true?',
      options: [
        'Interfaces can declare instance fields',
        'Interfaces can provide default method implementations',
        'A class can only implement one interface',
        'Interfaces require a constructor',
      ],
      correctIndex: 1,
      explanation:
        'Since C# 8, interfaces support default method implementations while still disallowing instance fields and constructors.',
    },
  ],
  advanced: [
    {
      id: 'q-adv-1',
      topic: 'Async & Concurrency',
      question: 'Why should async void be avoided for non-event-handler methods?',
      options: [
        'It executes synchronously on the thread pool',
        'Callers cannot await it and unhandled exceptions crash the process',
        'It blocks the UI thread automatically',
        'The C# compiler forbids await inside async void',
      ],
      correctIndex: 1,
      explanation:
        'async void returns no Task to await, so callers cannot track completion and exceptions propagate directly to the SynchronizationContext or ThreadPool.',
    },
    {
      id: 'q-adv-2',
      topic: 'Modern C# (Records & Patterns)',
      question: 'Why is Span<T> declared as a ref struct in C#?',
      options: [
        'To allow boxing into object easily',
        'To guarantee it lives only on the stack and never escapes to the managed heap',
        'To enable async/await state machine capture',
        'To make it thread-safe across Task.Run calls',
      ],
      correctIndex: 1,
      explanation:
        'As a ref struct, Span<T> cannot be boxed or captured across await boundaries, ensuring safe zero-allocation slicing of stack or managed memory.',
    },
    {
      id: 'q-adv-3',
      topic: 'OOP & Interfaces',
      question: 'In IEnumerable<out T>, what does the out modifier enable?',
      options: [
        'Contravariance, allowing IEnumerable<object> to assign to IEnumerable<string>',
        'Covariance, allowing IEnumerable<string> to assign to IEnumerable<object>',
        'Mutable element replacement during iteration',
        'Stack-only allocation of iterators',
      ],
      correctIndex: 1,
      explanation:
        'out marks T as covariant (output-only), allowing a sequence of a derived type like string to be used where a base type like object is expected.',
    },
  ],
};

export function createInitialProgress(): LearningProgress {
  return {
    messagesSent: 0,
    codeExplainedCount: 0,
    bugsDebuggedCount: 0,
    exercisesCompletedIds: [],
    quizzesCompleted: 0,
    quizQuestionsAnswered: 0,
    quizCorrectAnswers: 0,
    topicsExplored: [],
  };
}

export function createSession(difficulty: Difficulty, title = 'New C# Session'): ChatSession {
  const now = Date.now();
  return {
    id: `sess-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    difficulty,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function deriveSessionTitle(messages: ChatMessage[], fallback = 'New C# Session'): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return fallback;
  const cleaned = firstUser.content.replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  return cleaned.length > 42 ? `${cleaned.slice(0, 42).trimEnd()}...` : cleaned;
}

export function recordMessageSent(progress: LearningProgress): LearningProgress {
  return {
    ...progress,
    messagesSent: progress.messagesSent + 1,
  };
}

export function recordCodeExplained(
  progress: LearningProgress,
  concepts: string[] = []
): LearningProgress {
  const merged = new Set([...progress.topicsExplored, ...concepts.filter(Boolean)]);
  return {
    ...progress,
    codeExplainedCount: progress.codeExplainedCount + 1,
    topicsExplored: Array.from(merged).slice(0, 24),
  };
}

export function recordBugDebugged(progress: LearningProgress, bugType?: string): LearningProgress {
  const merged = new Set(progress.topicsExplored);
  if (bugType) merged.add(bugType);
  return {
    ...progress,
    bugsDebuggedCount: progress.bugsDebuggedCount + 1,
    topicsExplored: Array.from(merged).slice(0, 24),
  };
}

export function recordExerciseCompleted(
  progress: LearningProgress,
  exerciseId: string,
  topic?: string
): LearningProgress {
  const ids = new Set(progress.exercisesCompletedIds);
  ids.add(exerciseId);
  const topics = new Set(progress.topicsExplored);
  if (topic) topics.add(topic);
  return {
    ...progress,
    exercisesCompletedIds: Array.from(ids),
    topicsExplored: Array.from(topics).slice(0, 24),
  };
}

export function recordQuizResult(
  progress: LearningProgress,
  answered: number,
  correct: number,
  topics: string[] = []
): LearningProgress {
  const mergedTopics = new Set([...progress.topicsExplored, ...topics.filter(Boolean)]);
  return {
    ...progress,
    quizzesCompleted: progress.quizzesCompleted + 1,
    quizQuestionsAnswered: progress.quizQuestionsAnswered + Math.max(0, answered),
    quizCorrectAnswers: progress.quizCorrectAnswers + Math.max(0, correct),
    topicsExplored: Array.from(mergedTopics).slice(0, 24),
  };
}

export function calculateQuizAccuracy(progress: LearningProgress): number | null {
  if (progress.quizQuestionsAnswered === 0) return null;
  return Math.round((progress.quizCorrectAnswers / progress.quizQuestionsAnswered) * 100);
}

export function calculateMasteryPercent(progress: LearningProgress): number {
  const score =
    Math.min(progress.messagesSent * 4, 24) +
    Math.min(progress.codeExplainedCount * 8, 20) +
    Math.min(progress.bugsDebuggedCount * 8, 20) +
    Math.min(progress.exercisesCompletedIds.length * 12, 24) +
    Math.min(progress.quizzesCompleted * 6, 12);
  return Math.min(100, score);
}
