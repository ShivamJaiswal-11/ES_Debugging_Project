# type: ignore
from agno.agent import Agent
from agno.models.groq import Groq
# from agno.team.team import Team
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
