import pytest

from comfyrest.execution import (
    WorkflowRunner,
    WorkflowRunRequest,
    JsonWorkflowSource,
    ComfyUIExecution,
)


class DummyClient:
    """Minimal stand-in for ComfyUIClient."""

    def __init__(self):
        self.queued = []

    async def queue_prompt(self, prompt):
        self.queued.append(prompt)
        return ComfyUIExecution(prompt_id="prompt-1", client_id="client-1")

    async def wait_for_completion(self, execution, timeout=600):
        execution.status = "completed"
        execution.outputs = {"dummy": True}
        return execution


@pytest.mark.asyncio
async def test_runner_executes_with_inmemory_source():
    workflow = {
        "nodes": [
            {"id": 1, "class_type": "FooNode", "inputs": {"text": "hello"}},
        ]
    }
    source = JsonWorkflowSource({"wf1": workflow})
    client = DummyClient()
    runner = WorkflowRunner(source, client)

    execution = await runner.run(WorkflowRunRequest(workflow_id="wf1"))

    assert execution.status == "completed"
    assert execution.outputs == {"dummy": True}
    assert client.queued  # ensures queue_prompt was called
