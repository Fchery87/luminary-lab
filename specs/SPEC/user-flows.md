---
title: "User Flows"
owner: "architect"
version: "1"
date: "2025-12-13"
status: "draft"
---

# User Flows

## Flow 1: Upload and Process Single Image
**Persona**: Anya Petrova (The Scaling Professional)
**Goal**: Quickly upload a single RAW image, apply an AI-powered preset, and receive a professionally retouched and graded final image to save time on post-production.

### Steps
1. User logs into the application (see Flow 3).
2. From the Dashboard, user clicks the primary "Upload" or "New Edit" button.
3. User is presented with a file browser/upload zone. User selects a single RAW image file from their local machine.
4. System uploads and validates the file, then displays a preview in the main workspace.
5. System analyzes the image and loads a default "Suggested" preset.
6. User browses the curated "Preset Gallery," viewing thumbnails and titles (e.g., "Clean Beauty," "Cinematic Portrait").
7. User selects a desired preset.
8. A modal appears with a single "Intensity" slider (default 70%). User adjusts if desired and clicks "Apply."
9. System displays a loading state with a progress indicator as the AI processes the image.
10. System displays the "Result View" with a high-quality preview of the processed image.
11. User can toggle a before/after comparison (side-by-side or slider).
12. User clicks the "Export" button.
13. A modal appears with export options: File Format (JPG, 16-bit TIFF) and Color Space (sRGB). User selects and confirms.
14. System processes the export and initiates a download of the final file to the user's machine.

### Screens
- **Dashboard**: Primary landing page after login, contains upload CTA and potentially recent activity.
- **Upload/File Select**: Screen or modal for file selection.
- **Main Workspace**: Central view with image preview, preset gallery sidebar, and primary action buttons (Apply, Export).
- **Preset Application Modal**: Simple overlay with intensity slider and Apply/Cancel buttons.
- **Processing View**: Full-screen or overlay loading state with progress.
- **Result & Export View**: Main workspace updated with final image, enhanced export controls.
- **Export Modal**: Options for format and color space.

### Success State
User has a downloaded, professionally retouched file that meets their quality standards in a fraction of the time manual editing would require. The user feels confident they can repeat this process for an entire shoot.

### Error States
- **Invalid File Error**: Uploaded file is not a supported RAW format. Recovery: System displays a clear error message, highlighting the unsupported file type, and allows the user to try again.
- **Processing Failure**: AI engine fails to process the image (timeout, server error). Recovery: System displays a generic "Something went wrong" message with an option to retry the process.
- **Export Failure**: File fails to generate or download. Recovery: System notifies the user and provides a link to retry the export.

## Flow 2: Account Creation (New User Onboarding)
**Persona**: Ben Carter (The Quality-Conscious Hobbyist)
**Goal**: Create a new account to access the Luminary Lab application and begin using its core features.

### Steps
1. User navigates to the Luminary Lab public homepage.
2. User clicks on the "Start Free Trial" or "Sign Up" call-to-action button.
3. User is redirected to the Registration page.
4. User enters a valid email address, a secure password (meeting strength requirements), and confirms the password in a second field.
5. User clicks the "Create Account" button.
6. System validates the inputs (email format, password strength, matching passwords).
7. System checks that the email is not already registered.
8. System creates the new user account, logs the user in automatically, and redirects them to the Dashboard.

### Screens
- **Public Homepage**: Marketing site with value props and sign-up CTA.
- **Registration Page**: Simple form with fields for Email, Password, Confirm Password, and Submit button.

### Success State
User is successfully authenticated, has an active session, and is viewing the application Dashboard, ready to upload their first image.

### Error States
- **Weak Password Error**: Entered password does not meet complexity requirements. Recovery: Inline validation message appears below the password field explaining requirements.
- **Password Mismatch Error**: "Confirm Password" field does not match the "Password" field. Recovery: Inline validation message appears.
- **Duplicate Email Error**: The provided email is already associated with an account. Recovery: A persistent error message appears at the top of the form asking the user to log in or use a different email.

## Flow 3: User Login
**Persona**: Anya Petrova (Returning Professional User)
**Goal**: Securely access their Luminary Lab account to continue their editing work.

### Steps
1. User navigates to the Luminary Lab application URL or public homepage.
2. User clicks the "Log In" link/button.
3. User is redirected to the Login page.
4. User enters their registered email address and password.
5. User clicks the "Log In" button.
6. System validates credentials.
7. System creates a secure session and redirects the user to their Dashboard.

### Screens
- **Login Page**: Simple form with Email, Password fields, a "Log In" button, and links to "Forgot Password" and "Sign Up."
- **Dashboard**: (Success screen) The main application interface.

### Success State
User is authenticated and granted access to their personal dashboard and all application features associated with their subscription tier.

### Error States
- **Invalid Credentials Error**: The email/password combination is incorrect. Recovery: A generic error message ("Invalid email or password") is displayed. User can re-enter credentials or use a "Forgot Password" link.
- **Session Expiry**: User's session token expires after 1 hour of inactivity. Recovery: Upon next action, the system redirects the user to the Login page with a message indicating their session has expired. User must log in again.