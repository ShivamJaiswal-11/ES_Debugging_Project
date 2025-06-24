# type: ignore
from agno.agent import Agent
from agno.models.groq import Groq
# from agno.team.team import Team

from agno.tools.duckduckgo import DuckDuckGoTools
from fastapi import HTTPException


def create_analysis_agent():
    instructions = """
    You are an experienced Java performance engineer with deep expertise in analyzing Java thread dumps and Elasticsearch internals.

    Your job is to analyze the given diagnostic output (like jstack or hot_threads), and return a two-part response:

    1. **Performance Analysis Summary**: A concise 4-point summary focused on:
       - Deadlocks
       - High CPU-consuming threads
       - I/O or GC stalls
       - Thread pool contention

    2. **Detailed Explanation and Fixes**: Explanation of each issue, its significance, and actionable recommendations (including JVM or Elasticsearch tuning tips).

    Do not repeat raw logs. Use bullet points or short paragraphs. Language should be concise, professional, and easy to understand.
    """

    return Agent(
        model=Groq(
            id="deepseek-r1-distill-llama-70b",
            temperature=0.6,
            max_tokens=1024,
            top_p=0.95
        ),
        markdown=True,
        instructions=[instructions]
    )

analysis_agent = create_analysis_agent()

def analyze_with_agent(diagnostic_output: str, source: str = "jstack") -> str:
    truncated_output = diagnostic_output[:20000]
    try:
        response = analysis_agent.run("""
        Please analyze the following diagnostic output from {}:

        {}
        """.format(source.upper(), truncated_output)).content
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent analysis failed: {str(e)}")


# Agent 1: JStack
jstack_agent = Agent(
    name="JStackAgent",
    role="Analyze Java thread dumps",
    model=Groq(id="deepseek-r1-distill-llama-70b"),
    instructions=[
        "You are a JVM debugging expert.",
        "Input is a JStack output.",
        "Return Your Answer as : 'summary': [...], 'explanation': '...'",
        "Don't return the <think>...</think> part",
        "Summary: key performance issues in bullets (e.g. deadlocks, blocking, high CPU).",
        "Explanation: detailed diagnostics + recommendations."
    ],
    tools=[DuckDuckGoTools()],   
    markdown=True
)

# Agent 2: HotThreads
hotthreads_agent = Agent(
    name="HotThreadsAgent",
    role="Analyze Elasticsearch hot_threads output",
    model=Groq(id="deepseek-r1-distill-llama-70b"),
    instructions=[
        "You are an expert in Elasticsearch performance tuning.",
        "Input is a hot_threads output.",
        "Return Your Answer as : 'summary': [...], 'explanation': '...'",
        "Don't return the <think>...</think> part",
        "Summary: top CPU-intensive threads or blocking ops.",
        "Explanation: performance issues and what they mean."
    ],
    tools=[DuckDuckGoTools()],   
    markdown=True
)

# Agent 3: Tasks
tasks_agent = Agent(
    name="TasksAgent",
    role="Analyze Elasticsearch _tasks output",
    model=Groq(id="deepseek-r1-distill-llama-70b"),
    instructions=[
        "You analyze Elasticsearch _tasks API output to find stuck, long-running, or high-load tasks.",
        "Don't ask for more data",
        "Return Your Answer as : 'summary': [...], 'explanation': '...'",
        "Don't return the <think>...</think> part",
        "Summary: stuck or long-running tasks in bullets.",
        "Explanation: root cause and suggested actions."
    ],
    tools=[DuckDuckGoTools()],   
    markdown=True
)

combined_diagnostics_agent = Agent(
    name="System Diagnostic Agent",
    role="Analyze combined diagnostic data from Elasticsearch including jstack, hot_threads, and tasks output.",
    model=Groq(id="deepseek-r1-distill-llama-70b"),
    instructions=[
    "You are an expert in diagnosing Java and Elasticsearch performance problems.",
    "Input will be a dictionary with three fields: 'jstack', 'hot_threads', and 'tasks'.",
    "'jstack' contains thread dumps for each node, 'hot_threads' contains CPU-heavy thread traces, and 'tasks' contains currently running or stuck Elasticsearch tasks.",
    "Read all three inputs and identify any critical performance issues, deadlocks, blocking IO, thread starvation, long-running queries, or stuck tasks.",
    "Return Your Answer as : 'summary': [...], 'explanation': '...'",
    "Don't return the <think>...</think> part",
    "'summary': 4–6 bullet points (start each with •) that capture high-level issues, written for an operations engineer.",
    "'explanation': a well-structured paragraph with details of each finding and suggestions to resolve them. Avoid developer/internal terms.",
    "Ensure you explain what is happening and how it affects performance, e.g., high CPU from hot threads, waiting threads in jstack, or long-running tasks.",
    "Keep output readable and concise. Do not echo the raw inputs. Do not include agent system messages or tool call thoughts."
    ],
    tools=[DuckDuckGoTools()],   
    markdown=True
)

def analyze_with_multi_agent(diagnostic_output: str, source: str = "jstack") -> str:
    truncated_output = diagnostic_output
    if source.lower() == "jstack":
        analysis_Agent = jstack_agent
    elif source.lower() == "hot_threads":
        analysis_Agent = hotthreads_agent
    elif source.lower() == "tasks":
        analysis_Agent = tasks_agent
    elif source.lower() == "jstack + hot_threads + tasks":
        analysis_Agent = combined_diagnostics_agent
    else:
        raise HTTPException(status_code=400, detail="Unsupported diagnostic source")
    try:
        response = analysis_Agent.run("""
        Please analyze the following diagnostic output from {}:

        {}
        """.format(source.upper(), truncated_output)).content
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent analysis failed: {str(e)}")
