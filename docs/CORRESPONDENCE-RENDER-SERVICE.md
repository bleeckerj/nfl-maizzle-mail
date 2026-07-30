# Correspondence render service

This service exposes the existing generic Maizzle correspondence builder over
HTTP. It is intended for server-to-server callers such as Backoffice. It
renders email content and never sends email.

The service is deliberately generic. It has no Office Hours routes, copy,
business rules, contact lookup, or delivery logic.

## Start the service

The service entry point is scripts/correspondence-server.mjs. The npm command
is:

~~~bash
npm run serve:correspondence
~~~

Configuration:

- CORRESPONDENCE_RENDER_PORT defaults to 8789.
- CORRESPONDENCE_RENDER_TOKEN is required.

Put the token and port in the service's private environment configuration.
Do not put the token in a checked-in file or expose it to browser code. The
service should be reachable through an HTTPS server-to-server URL in
production.

The service logs its listening port to stdout and render failures to stderr.
It should run as a long-lived process behind the chosen hosting or reverse
proxy layer. This repository does not prescribe that hosting layer.

## Endpoint

~~~text
POST /render/correspondence
Authorization: Bearer <CORRESPONDENCE_RENDER_TOKEN>
Content-Type: application/json
~~~

Requests without the bearer token receive 401. Unknown paths receive 404.
Request bodies larger than two megabytes are rejected.

## Request payload

The payload uses the existing standard-correspondence contract:

~~~json
{
  "template": "standard-correspondence",
  "subject": "A direct note",
  "preheader": "A short inbox preview.",
  "bodyMarkdown": "Hello Ada.\n\nThis is the message body.",
  "signature": {
    "name": "Julian",
    "lines": [
      "[Near Future Laboratory](https://nearfuturelaboratory.com)"
    ]
  },
  "footerNote": "Reply directly to this email.",
  "trackingEnabled": false
}
~~~

The renderer consumes the generic fields supported by the existing
build_correspondence MCP tool, including bodyHtml, from, sharedItems,
footerLinks, theme, showSubject, and showFromHeader. Unknown fields are
ignored by the correspondence normalizer when they are not part of the
rendered template contract.

trackingEnabled is accepted as caller metadata. Tracking behavior is governed
by the selected generic template and the caller should set it to false for
personal correspondence.

## Response

Successful renders return:

~~~json
{
  "template": "standard-correspondence",
  "subject": "A direct note",
  "htmlBody": "<!DOCTYPE html>...",
  "textBody": "Hello Ada. This is the message body."
}
~~~

The HTML body is produced by scripts/build-correspondence.mjs and the
selected Maizzle template. The plain-text body is derived from the rendered
HTML after styles and tags are removed.

Render or schema failures return HTTP 400 with an error message. Unexpected
service failures should be monitored as service errors and retried by the
caller only when the caller's operation is safe to retry.

## Local test

Run the focused service test:

~~~bash
node --test tests/correspondence-email/correspondence-server.test.mjs
~~~

Run the broader correspondence tests:

~~~bash
npm run test:correspondence
~~~

The service test verifies bearer-token protection, standard-correspondence
rendering, HTML/plain-text output, and removal of executable script markup.

## Backoffice integration

Backoffice stores the service URL in
MAIZZLE_CORRESPONDENCE_RENDER_URL and sends
MAIZZLE_CORRESPONDENCE_RENDER_TOKEN as the bearer token. The Backoffice
confirm route:

1. checks the signup and existing Soup-to-Nuts correspondence;
2. promotes a pending signup when necessary;
3. composes its Office Hours-specific body;
4. calls this endpoint;
5. sends the returned HTML and text to Soup-to-Nuts for preparation and
   dispatch.

The service does not receive or need a contact ID, email address, list ID,
signup attempt ID, or Soup-to-Nuts API key. It only renders the payload it is
given.

## Security and operations

- Keep CORRESPONDENCE_RENDER_TOKEN private and rotate it if the service URL or
  Backoffice credentials are exposed.
- Put the service behind HTTPS and restrict access to the Backoffice caller
  where the hosting layer supports network policy.
- Do not log request bodies; correspondence bodies may contain personal
  information.
- The service has no send or delivery capability. A successful render does not
  mean an email was sent.
- To pause rendering, stop the service or rotate its token. This does not
  cancel emails already prepared or dispatched by Soup-to-Nuts.
