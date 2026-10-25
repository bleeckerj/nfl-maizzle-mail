// Item surface controls for single-column and its legacy alias.
// Schema discovery uses this contract; the renderer falls back per field.
export const singleColumnContainerStyles = {
  "type": [
    "object",
    "null"
  ],
  "description": "Optional item background and padding. Omitted or empty values inherit the section styles.",
  "properties": {
    "backgroundColor": {
      "type": [
        "string",
        "null"
      ],
      "description": "Item background color or CSS gradient; falls back to the section background.",
      "examples": [
        "#e8f4ff"
      ]
    },
    "padding": {
      "type": [
        "string",
        "null"
      ],
      "description": "Item CSS padding; falls back to section padding, then 20px.",
      "examples": [
        "20px"
      ]
    }
  },
  "additionalProperties": false
};
