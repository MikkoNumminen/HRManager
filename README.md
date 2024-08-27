# Company HR management system (v0.92)

A system for managing employees, teams and departments in a company.

## Install

### 1. Set Up Environment Variables

Create a `.env` file with the necessary environment variables. Run the following command in your terminal:

echo 'DATABASE_URL="file:./dev.db"' > .env

### 2. Install app

npm install

### 3. Generate database and migration file

npx prisma migrate dev --name newDatabase

### 4. Run app

npm run dev

### Run tests

npm test

## Data model

- **Employee**
  - Can belong to multiple teams
  - Has a name, email and title
  - Has a manager
- **Team**
  - TODO: Belongs to a department
  - Has a name
  - Has a manager
- **Manager**
  - Is an employee
  - Can manage multiple teams

## Architecture

- **Front-end**:

  - Built with **Next.js** and **React**.
  - Written in **TypeScript** for type safety and better developer experience.
  - Utilizes the **MUI** component library for a consistent UI/UX.
  - Communicates with the backend via a RESTful API.

- **Back-end**:

  - Built with **Next.js** and **Node.js**.
  - Written in **TypeScript** for type safety and maintainability.
  - Provides a RESTful API for the front-end.
  - Uses **Prisma** as an ORM to interact with the database.

- **Database**:

  - Uses **SQLite** in development for simplicity and ease of setup.
  - The schema is managed and maintained using **Prisma** migrations.
  - The database is normalized (3rd normal form), with proper data types, primary keys, foreign keys, and indexing.

- **Testing**:

  - **_Jest_** is used for unit and integration testing across both front-end and back-end codebases.
  - Ensures code quality, reliability, and prevents regressions.

- **Type Safety**:
  - **_TypeScript_** is used throughout the front-end and back-end, ensuring a consistent type system and reducing runtime errors.

## Uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for git commits

# Current Patch Notes (0.93)

### Features and Enhancements

- **Refactor:** Improved code organization and maintainability.

# Patch Notes (0.92)

### Features and Enhancements

- **Fix:** Removing people now also removes them from every team and manager position.
- **Fix:** Adding a manager to a team also adds them as a member of the team.
- **Feat:** Implement transactions for all database modifications.

# Under Development

- **Pending**: Refactor Teams Management to use a similar design to Persons Management.
- **Pending**: Add top bar with user authentication.

# Further development

- Develop UI
- Add authentication and authorization
- Remove ORM
- Deploy using CI/CD (Github Actions)

## Infrastructure

1: Deploy to Firebase

- Firebase for hosting or additional services.

2: Deploy to AWS

- Uses **RDS** for the database
- Uses **Fargate** for the back-end
- Uses **S3** for storing static files
- Deploy using Terraform **(IaaC)**
