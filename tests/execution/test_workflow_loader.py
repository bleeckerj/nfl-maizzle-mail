import json

from comfyrest.execution import WorkflowLoader


def test_loader_from_dict_normalizes_nodes():
    workflow = {
        "nodes": [
            {
                "id": 3,
                "class_type": "KSampler",
                "inputs": {"cfg": 7.0, "_meta": {"ignored": True}},
            }
        ]
    }
    loader = WorkflowLoader.from_dict(workflow)
    prompt = loader.to_prompt()
    assert "3" in prompt
    assert prompt["3"]["inputs"]["cfg"] == 7.0
    assert "_meta" not in prompt["3"]["inputs"]


def test_loader_from_json_generates_client_id():
    workflow = {"nodes": []}
    payload = WorkflowLoader.from_json(json.dumps(workflow)).to_prompt_payload()
    assert "prompt" in payload
    assert payload["prompt"] == {}
    assert "client_id" in payload and payload["client_id"]
