// Declare the logo placement fields consumed by the Backoffice exporter.
// Schema discovery uses this shape so regenerating a schema retains the same
// authoring controls as the maintained Dense Discovery newsletter schema.
export function socialCardLogoPositionSchema() {
  return {
    "type": "object",
    "default": {
      "side": "left",
      "nudge": {
        "x": 0,
        "y": 0,
        "east": 0,
        "west": 0,
        "north": 0,
        "south": 0
      }
    },
    "description": "Logo anchor and proportional movement within the padded social-card area. Omitted controls keep the upper-left anchor.",
    "properties": {
      "side": {
        "type": "string",
        "enum": [
          "left",
          "right"
        ],
        "default": "left",
        "description": "Upper-edge horizontal anchor before nudges are applied."
      },
      "nudge": {
        "type": "object",
        "default": {
          "x": 0,
          "y": 0,
          "east": 0,
          "west": 0,
          "north": 0,
          "south": 0
        },
        "description": "Movement relative to the available padded travel area. Combine x/east/west and y/north/south, then clamp each resulting axis to -1..1.",
        "properties": {
          "x": {
            "type": "number",
            "default": 0,
            "description": "Positive moves right; negative moves left."
          },
          "y": {
            "type": "number",
            "default": 0,
            "description": "Positive moves up; negative moves down."
          },
          "east": {
            "type": "number",
            "default": 0,
            "description": "Adds rightward movement."
          },
          "west": {
            "type": "number",
            "default": 0,
            "description": "Adds leftward movement."
          },
          "north": {
            "type": "number",
            "default": 0,
            "description": "Adds upward movement."
          },
          "south": {
            "type": "number",
            "default": 0,
            "description": "Adds downward movement; 1 reaches the lower padded edge."
          }
        },
        "additionalProperties": false
      }
    },
    "additionalProperties": false
  };
}
