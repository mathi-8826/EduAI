# Career Compass AI

Use the following prompt with ChatGPT, Claude, Gemini, or any AI coding assistant to generate your project.

AI Career Preparation Platform - Full Stack Project Prompt

Project Overview

Build a modern AI-Powered Career Preparation Platform that helps students prepare for placements through VQR Aptitude Tests, Coding Tests, and an AI Learning Dashboard.

The application should use:

Frontend: React.js + Vite

Styling: Tailwind CSS + shadcn/ui

Backend: Supabase

Database: SQL (Supabase)

Authentication: Supabase Email Authentication (Email + OTP/Magic Link only)

AI: Google Gemini API

Charts: Recharts

Icons: Lucide React

Notifications: Sonner/Toast

The UI should be modern, responsive, and placement-focused.

Features

Authentication

Use Supabase Authentication.

Only allow

Email Login

Email Signup

Magic Link / OTP

No Google login.

During signup collect

Full Name

College

Department

Year

Email

Store profile information inside Supabase.

Dashboard

After login the student lands on Dashboard.

Dashboard should contain

Welcome Section

Display

Hello, {Student Name}

Today's Motivation

Current Placement Readiness Score

Progress Circle

Performance Cards

Show

Total Tests Taken

Coding Tests Completed

VQR Tests Completed

Average Score

Current Streak

Rank (optional)

Previous Test Results

Display all previous tests.

Each card contains

Test Name

Date

Category

Score

Time Taken

Accuracy

Difficulty

Buttons

View Analysis

Retake Test

Performance Graph

Use Recharts.

Graphs

Weekly Scores

Monthly Progress

Accuracy Trend

Topic Wise Performance

Weak Areas

Automatically calculate weak topics.

Example

Quantitative Aptitude

Logical Reasoning

Arrays

Strings

DBMS

OOPS

Communication

Show improvement percentage.

AI Recommendation

Use Gemini API.

Gemini should analyze previous test results and return

Strengths

Weaknesses

Personalized learning plan

Recommended topics

Interview preparation tips

Motivational feedback

Quick Actions

Buttons

Start Coding Test

Start VQR Test

View Profile

Logout

VQR Test Module

Create an Aptitude Test Module.

Categories

Quantitative Aptitude

Logical Reasoning

Verbal Ability

Each category contains multiple topics.

Examples

Quantitative

Time & Work

Time Speed Distance

Profit Loss

Percentages

Probability

Permutation

Combination

Pipes & Cisterns

Partnership

Reasoning

Blood Relations

Directions

Seating Arrangement

Coding Decoding

Series

Analogy

Verbal

Grammar

Synonyms

Antonyms

Reading Comprehension

Fill in the blanks

Sentence Correction

Each test

20 Questions

Timer

30 Minutes

MCQ

Randomized Questions

One question at a time

Progress Bar

Submit Test

After submission

Show

Score

Correct Answers

Wrong Answers

Accuracy

Time Taken

Topic Analysis

Difficulty Analysis

Store results inside Supabase.

Coding Test Module

Coding platform similar to LeetCode.

Categories

Easy

Medium

Hard

Topics

Arrays

Strings

Linked List

Trees

Graphs

Stack

Queue

Binary Search

Sorting

Dynamic Programming

Each coding question contains

Title

Description

Examples

Constraints

Test Cases

Hints

Difficulty

Tags

Student writes code inside an editor.

Languages

Python

Java

JavaScript

C++

Use Monaco Editor.

Run Code button.

Submit Code button.

Store

Submission

Language

Execution Time

Status

Score

Attempt Count

Submission Date

AI Interview Preparation

Use Gemini API.

Generate interview questions based on

Role

Company Type

Difficulty

Domain

Examples

Software Engineer

Data Scientist

Frontend Developer

Backend Developer

QA Engineer

DevOps Engineer

Cyber Security

AI Engineer

Gemini should

Generate question

Evaluate answer

Provide score

Explain mistakes

Suggest improvements

Database Design

Supabase Tables

users

id

name

college

department

year

email

created_at

vqr_tests

id

title

category

difficulty

duration

created_at

vqr_questions

id

test_id

question

option_a

option_b

option_c

option_d

correct_answer

topic

difficulty

vqr_results

id

user_id

test_id

score

accuracy

time_taken

created_at

answers_json

coding_questions

id

title

difficulty

topic

description

examples

constraints

starter_code

solution

created_at

coding_submissions

id

user_id

question_id

language

code

status

score

execution_time

submitted_at

ai_feedback

id

user_id

test_type

feedback

strengths

weaknesses

recommendations

created_at

Dashboard Analytics

Calculate automatically

Placement Readiness %

Average Coding Score

Average VQR Score

Strongest Topic

Weakest Topic

Total Study Hours

Tests Completed

Daily Streak

Progress Trend

AI Features

Gemini API should

Analyze performance

Recommend next topics

Generate interview questions

Evaluate descriptive answers

Create weekly learning plan

Provide placement tips

Generate motivational messages

Generate coding hints

UI Pages

Landing Page

Login

Signup

Dashboard

Profile

Coding Test List

Coding Workspace

VQR Test List

VQR Test

Result Page

AI Analysis Page

Settings

404 Page

Extra Features

Dark Mode

Responsive Design

Search

Filters

Pagination

Export Results as PDF

Leaderboard

Bookmarks

Daily Challenge

Achievement Badges

Notifications

Technical Requirements

Use React functional components.

Use React Router for navigation.

Use Context API or Zustand for state management.

Use Supabase Row Level Security (RLS) to ensure users can only access their own data.

Use environment variables for the Supabase URL, Supabase Anon Key, and Gemini API key.

Validate all forms.

Show loading skeletons and toast notifications.

Follow a clean folder structure with reusable components and custom hooks.

Make the application fully responsive for desktop, tablet, and mobile.

Expected Output

Generate a production-ready full-stack project with:

Clean and modular React code

Responsive UI using Tailwind CSS and shadcn/ui

Complete Supabase database schema and SQL

Authentication flow with email-only login

Gemini API integration for AI recommendations and interview feedback

Dashboard with analytics, previous test results, and charts

VQR aptitude test module

Coding test module with Monaco Editor

Well-commented code, reusable components, and best practices suitable for a college mini project and future deployment.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/250d0834-3875-4db0-9810-5607dd55e5bf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
