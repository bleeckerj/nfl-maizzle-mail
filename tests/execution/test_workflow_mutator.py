from comfyrest.execution import WorkflowMutator


def test_apply_changes_updates_existing_fields():
    workflow = {"nodes": [{"id": 7, "inputs": {"cfg": 5.0}}]}
    changes = {"7": {"cfg": 9.25}}

    mutated = WorkflowMutator.apply_changes(workflow, changes)

    assert mutated["nodes"][0]["inputs"]["cfg"] == 9.25
    # ensure original workflow untouched
    assert workflow["nodes"][0]["inputs"]["cfg"] == 5.0


def test_apply_changes_handles_missing_node():
    workflow = {"nodes": [{"id": 1, "inputs": {}}]}
    changes = {"missing": {"cfg": 9}}

    mutated = WorkflowMutator.apply_changes(workflow, changes)

    assert mutated["nodes"][0]["inputs"] == {}
