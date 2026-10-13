# Ticket Analysis — Day 2

Working record for the five-ticket exercise. See [README.md](README.md) for the workflow.

> **Note:** These five tickets are **simulated** for this exercise — they are not from the training backlog. The exercise was completed **independently, without a partner**.

> **How to read each ticket:** *Initial analysis* was written by me **before** asking Claude. Everything under *Claude review* must be filled in with Claude's **actual** response — nothing there is pre-filled.

## Contents

1. [BUG-01 — Login fails for some users](#ticket-1-bug-01--login-fails-for-some-users)
2. [BUG-02 — API returns 500 error](#ticket-2-bug-02--api-returns-500-error)
3. [FEAT-01 — Add pagination to the course list](#ticket-3-feat-01--add-pagination-to-the-course-list)
4. [FEAT-02 — Improve API response time](#ticket-4-feat-02--improve-api-response-time)
5. [FEAT-03 — Allow users to update their profile](#ticket-5-feat-03--allow-users-to-update-their-profile)

---

## Ticket 1: BUG-01 — Login fails for some users

**Description:**

> Some users cannot log in to the application. Please investigate and fix the issue.

### Initial analysis (mine, before Claude)

1. **What it asks:** The ticket asks us to investigate and fix the login issue affecting some users.
2. **What's ambiguous:** It does not specify which users are affected, what error they encounter, or when the issue occurs.
3. **First step:** I would try to reproduce the issue and check the authentication logs for failed login attempts.

### Claude review (actual results)

**Claude's feedback:**

1. Missing gaps

Impact and urgency: You didn’t assess severity, such as how many users are affected, whether it’s a full outage or intermittent, or whether there’s a workaround. This decides priority.

Definition of done: You didn’t say what “fixed” means or how you’d confirm it, for example affected users logging in successfully or failure rates returning to baseline.

2. Clarifying questions

What exactly do affected users see (error message, screen, or behavior), and on which platform or login method?

When did this start, and did it coincide with a deployment, config change, or other incident?

What do the affected users have in common, such as account type, region, SSO provider, or browser?

3. Key takeaway

Go beyond listing what’s unknown: frame the ambiguities around scope, timing, and patterns so your first step targets the most likely cause.

**Missing gaps identified:**

- **Impact and urgency:** You didn't assess severity, such as how many users are affected, whether it's a full outage or intermittent, or whether there's a workaround. This decides priority.
- **Definition of done:** You didn't say what "fixed" means or how you'd confirm it, for example affected users logging in successfully or failure rates returning to baseline.

**Clarifying questions:**

1. What exactly do affected users see (error message, screen, or behavior), and on which platform or login method?
2. When did this start, and did it coincide with a deployment, config change, or other incident?
3. What do the affected users have in common, such as account type, region, SSO provider, or browser?

### Comparison with my initial analysis

- **Where we agreed:** Both flagged that the ticket doesn't say which users are affected, what error they see, or when it happens.
- **What Claude caught that I missed:** Impact and urgency (how many users, full outage or intermittent, workaround), and a definition of done (how to confirm the fix).
- **What Claude sharpened:** My ambiguities were a list of unknowns. Claude turned them into concrete questions: login method/platform, link to a recent deployment or config change, and what affected users have in common (account type, region, SSO provider, browser).

### What I learned

- Frame ambiguities around scope, timing, and patterns so the first step targets the most likely cause, rather than just listing what's unknown.
- Assess impact and urgency early, because it decides priority.
- Define what "fixed" means and how it will be verified before starting.

---

## Ticket 2: BUG-02 — API returns 500 error

**Description:**

> The API occasionally returns a 500 Internal Server Error. Please investigate and resolve the issue.

### Initial analysis (mine, before Claude)

1. **What it asks:** The ticket asks us to investigate and fix intermittent 500 Internal Server Errors from the API.
2. **What's ambiguous:** It does not identify the affected endpoint, the frequency of the errors, or the conditions that trigger them.
3. **First step:** I would identify the affected endpoint and correlate error logs with request timestamps to look for a reproducible pattern.

### Claude review (actual results)

**Claude's feedback:**

1. Missing gaps

Timeline and recent changes: You didn’t ask when the errors started or whether they line up with a deployment, traffic spike, or dependency change. That often narrows intermittent failures fastest.

Impact and success criteria: You didn’t assess who is affected (internal or customer-facing, which clients) or define what “resolved” means, such as an acceptable error rate over a set period.

2. Clarifying questions

Which endpoints or operations return the 500, and can you share example request IDs or timestamps?

When did this start, and how often does it happen (for example, per hour or per percentage of requests)?

Is there a common factor among the failing requests, such as payload size, a specific client, time of day, or high load?

3. Key takeaway

This is stronger than your last analysis. Next, add impact and a measurable definition of “fixed” so your investigation has a clear finish line.

**Missing gaps identified:**

- **Timeline and recent changes:** You didn't ask when the errors started or whether they line up with a deployment, traffic spike, or dependency change. That often narrows intermittent failures fastest.
- **Impact and success criteria:** You didn't assess who is affected (internal or customer-facing, which clients) or define what "resolved" means, such as an acceptable error rate over a set period.

**Clarifying questions:**

1. Which endpoints or operations return the 500, and can you share example request IDs or timestamps?
2. When did this start, and how often does it happen (for example, per hour or per percentage of requests)?
3. Is there a common factor among the failing requests, such as payload size, a specific client, time of day, or high load?

### Comparison with my initial analysis

- **Where we agreed:** Both flagged the unknown endpoint, the error frequency, and the triggering conditions. My first step (correlating error logs with request timestamps) matches Claude's request for example request IDs and timestamps.
- **What Claude caught that I missed:** Timeline and recent changes (deployment, traffic spike, dependency change), who is affected, and a measurable definition of "resolved".
- **Progress since Ticket 1:** Claude rated this analysis stronger than Ticket 1, but impact and a definition of done were missing again.

### What I learned

- Check the timeline against recent deployments, traffic spikes, or dependency changes early; it often narrows intermittent failures fastest.
- Impact and a measurable definition of "fixed" (e.g. an acceptable error rate over a set period) were missing in both tickets so far, so include them by default from now on.

---

## Ticket 3: FEAT-01 — Add pagination to the course list

**Description:**

> Add pagination to the course list so users can browse courses across multiple pages.

### Initial analysis (mine, before Claude)

1. **What it asks:** The ticket asks us to add pagination to the course list so users can navigate through multiple pages of courses.
2. **What's ambiguous:** It does not specify the page size, pagination behavior, or whether pagination should be handled by the frontend, backend, or both.
3. **First step:** I would inspect the existing course list UI and API to understand how courses are currently retrieved and displayed.

### Claude review (actual results)

**Claude's feedback:**

1. Missing gaps

Interaction with existing features: You didn’t consider how pagination affects search, filters, or sorting on the course list, such as whether changing a filter resets to page 1.

Acceptance criteria and edge cases: You didn’t define what “done” looks like or consider cases like empty results, the last page, or courses added or removed while browsing.

2. Clarifying questions

What pagination style is expected (numbered pages, next/previous, “load more,” or infinite scroll), and how many courses per page?

Should the current page be reflected in the URL so users can share links and use the back button?

Is the goal mainly usability, or also performance because the course list is getting large?

3. Key takeaway

For feature tickets, look beyond the feature itself to how it fits with surrounding behavior and what the user experience should be when it’s done.

**Missing gaps identified:**

- **Interaction with existing features:** You didn't consider how pagination affects search, filters, or sorting on the course list, such as whether changing a filter resets to page 1.
- **Acceptance criteria and edge cases:** You didn't define what "done" looks like or consider cases like empty results, the last page, or courses added or removed while browsing.

**Clarifying questions:**

1. What pagination style is expected (numbered pages, next/previous, "load more," or infinite scroll), and how many courses per page?
2. Should the current page be reflected in the URL so users can share links and use the back button?
3. Is the goal mainly usability, or also performance because the course list is getting large?

### Comparison with my initial analysis

- **Where we agreed:** Both flagged the unknown page size and pagination behavior (Claude's question on pagination style and courses per page).
- **What I caught that Claude didn't ask about directly:** Whether pagination is handled by the frontend, backend, or both. Claude's usability-vs-performance question is related, since performance would point to server-side pagination.
- **What Claude caught that I missed:** How pagination interacts with search, filters, and sorting; acceptance criteria and edge cases (empty results, last page, data changing while browsing); and whether the page should be in the URL for sharing and the back button.
- **Pattern across tickets:** A definition of "done" was missing again, as in Tickets 1 and 2.

### What I learned

- For feature tickets, look beyond the feature itself to how it fits with surrounding behavior (search, filters, sorting, URL/back button).
- Ask why the feature is wanted (usability vs. performance), because it shapes the technical approach.
- List edge cases and acceptance criteria up front; a definition of "done" is still the gap that keeps recurring.

---

## Ticket 4: FEAT-02 — Improve API response time

**Description:**

> The API is too slow. Please improve its response time.

### Initial analysis (mine, before Claude)

1. **What it asks:** The ticket asks us to improve API performance and reduce response time.
2. **What's ambiguous:** It does not specify which endpoint is slow, the current response time, the target performance, or the expected workload.
3. **First step:** I would identify the slow endpoint and establish a performance baseline before investigating possible bottlenecks.

### Claude review (actual results)

**Claude's feedback:**

1. Missing gaps

Recent degradation vs. long-standing slowness: You didn’t ask whether the API became slower recently (after a release, data growth, or traffic increase) or has always been slow. These lead to very different investigations.

Where the slowness is observed: You didn’t consider whether it’s measured server-side or felt by clients, which could point to network, region, or client-side causes rather than the API itself.

2. Clarifying questions

Which endpoints feel slow, and what response times are you seeing (typical and worst-case)?

When did you first notice it, and has it gotten worse over time?

Who reports the slowness, and from where: a specific app, region, user group, or time of day?

3. Key takeaway

Your ambiguity list is solid; next, ask how “too slow” was measured, since the requester’s perception defines what success looks like.

**Missing gaps identified:**

- **Recent degradation vs. long-standing slowness:** You didn't ask whether the API became slower recently (after a release, data growth, or traffic increase) or has always been slow. These lead to very different investigations.
- **Where the slowness is observed:** You didn't consider whether it's measured server-side or felt by clients, which could point to network, region, or client-side causes rather than the API itself.

**Clarifying questions:**

1. Which endpoints feel slow, and what response times are you seeing (typical and worst-case)?
2. When did you first notice it, and has it gotten worse over time?
3. Who reports the slowness, and from where: a specific app, region, user group, or time of day?

### Comparison with my initial analysis

- **Where we agreed:** Both flagged the unknown slow endpoint and current response time. My first step (establish a baseline) lines up with Claude's question on typical and worst-case response times. Claude called my ambiguity list solid.
- **What I caught that Claude didn't ask about directly:** The target performance and expected workload.
- **What Claude caught that I missed:** Whether the slowness is recent (after a release, data growth, or traffic increase) or long-standing; whether it's measured server-side or felt by clients (network, region, client-side causes); and how "too slow" was measured by the requester.
- **Pattern across tickets:** Timeline ("when did it start?") came up again, as in Tickets 1 and 2.

### What I learned

- Ask whether a problem is new or long-standing; it leads to very different investigations.
- Confirm where a symptom is observed (server-side vs. client-side) before assuming the API itself is the cause.
- Ask how "too slow" was measured, since the requester's perception defines what success looks like.

---

## Ticket 5: FEAT-03 — Allow users to update their profile

**Description:**

> Allow users to edit and save their profile information.

### Initial analysis (mine, before Claude)

1. **What it asks:** The ticket asks us to let users edit and save their profile information.
2. **What's ambiguous:** It does not specify which profile fields are editable, what validation rules apply, or whether some changes require additional verification.
3. **First step:** I would inspect the current profile model and UI to identify the existing fields and determine what information can safely be edited.

### Claude review (actual results)

**Claude's feedback:**

1. Missing gaps

Permissions and security: You didn’t consider who can edit a profile (only the owner, or admins too) or how to protect sensitive changes like email or password from unauthorized edits.

Side effects of changes: You didn’t consider what else depends on profile data, such as notifications, other services, displayed names elsewhere, or audit history.

2. Clarifying questions

Which fields should be editable, and are any read-only (such as username or email)?

Should changes to sensitive fields trigger confirmation, like email verification or re-entering a password?

Can admins edit other users’ profiles, and do changes need to be logged?

3. Key takeaway

You’re consistently strong on spotting ambiguity; next, think about who else and what else the change touches beyond the immediate feature.

**Missing gaps identified:**

- **Permissions and security:** You didn't consider who can edit a profile (only the owner, or admins too) or how to protect sensitive changes like email or password from unauthorized edits.
- **Side effects of changes:** You didn't consider what else depends on profile data, such as notifications, other services, displayed names elsewhere, or audit history.

**Clarifying questions:**

1. Which fields should be editable, and are any read-only (such as username or email)?
2. Should changes to sensitive fields trigger confirmation, like email verification or re-entering a password?
3. Can admins edit other users' profiles, and do changes need to be logged?

### Comparison with my initial analysis

- **Where we agreed:** Both flagged which fields are editable and whether some changes need extra verification (Claude's question on email verification or re-entering a password). Claude called me consistently strong on spotting ambiguity.
- **What I caught that Claude didn't ask about directly:** Validation rules for the fields.
- **What Claude caught that I missed:** Who can edit a profile (owner only, or admins too) and protecting sensitive changes; side effects on things that depend on profile data (notifications, other services, displayed names, audit history); and whether changes need to be logged.
- **Pattern across tickets:** As in Ticket 3, Claude's main point was looking beyond the feature itself to what it touches.

### What I learned

- Think about who else and what else a change touches beyond the immediate feature.
- For anything involving user data, consider permissions (who can do it) and security for sensitive fields from the start.
- Check what depends on the data being changed, including audit history.

