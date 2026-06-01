# Security Specification

This document details the security model, invariants, and testing strategy for our Cloud Firestore database.

## 1. Data Invariants

1. **Owner-Exclusive Read/Write Access**: A story can only be accessed, created, edited, or deleted if the logged-in Firebase User ID matches the story's `userId` field. No public reading of personal stories is permitted in this workspace.
2. **Strict Identity Binding**: During document creation, the `userId` field in the payload must strictly match `request.auth.uid`.
3. **Immutability of Owner representation**: The `userId` of a story cannot be altered once specified (no story transfers).
4. **Structural Completeness**: Every story must have a valid `id`, a title of safe length (<= 150 chars), and a populated structure.

## 2. The "Dirty Dozen" Payloads

Here are twelve potential attacks/malicious operations that our security rules must successfully prevent:

1. **Unauthenticated Read Attempt**: Trying to read a story when not signed in.
2. **Identity Spoofing - Creation**: Creating a story under another user's `userId`.
3. **Identity Spoofing - Update**: Attempting to alter a story's `userId` after creation to transfer ownership.
4. **Story Hijacking**: Authenticated User B attempting to read Authenticated User A's story.
5. **Malicious Override**: Authenticated User B trying to edit/update Authenticated User A's story.
6. **Hostile Deletion**: Authenticated User B trying to delete Authenticated User A's story.
7. **Size/Payload Poisoning**: Injecting an extremely long title (e.g., > 10MB) to cause visual clutter/database overload.
8. **Malformed Story Structure**: Storing a story that lacks the essential `id` field.
9. **Unauthenticated Global Listing**: Querying all stories in the system without being logged in.
10. **Query Harvesting / Cross-User Scrape**: Authenticated User A querying `/stories` without filtering by their own `userId`.
11. **Type Poisoning**: Sending `isFavorite` as a long string, integer, or array instead of a boolean.
12. **Empty Title Custom Story**: Storing a story with an empty string or spaces for title.

## 3. Security Rules Outline (Pillars applied)

The actual firestore rules in `/firestore.rules` will assert:
- Standard helper checks: `isSignedIn()`, `isValidId(storyId)`, `isOwner(userId)`.
- Input validation: `isValidStory(incoming())`.
- Update Action limits: ensuring only safe fields (`title`, `isFavorite`, `sections`) are modified, and `userId` remains immutable.
