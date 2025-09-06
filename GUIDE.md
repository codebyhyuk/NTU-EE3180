# Development Environment Setup Guide and Rules

## FRONT-END
Since only 1 person is working on FE, you can use any dependencies you want.
<br> Below is a setup guide that you may follow for React+Vite.

```bash
# 1. Check Node.js installation. If not, install Node.js online.
node -v
npm -v

# 2. Move to frontend directory.
cd frontend

# 3. Create a React+Vite Project.
npm create vite@latest .

# 3-1. Choose Options
# - Framework: React
# - Variant: JavaScript or TypeScript

# 4. Install dependencies
npm install react-router-dom axios

# 5. Run development server
npm run dev
```


## BACK-END
Since 4 people are working on BE, we need to match our versions and dependecies so there are no clashes later on. This means that we will be making a new virtual environment and work on it.
<br> Below are the steps for creating a virtual environment and setting it up for our BE development.

```bash
# 1. Check Conda installation. If not, install Anaconda or Miniconda online.
conda --version

# 2. Create a conda virtual env based on the dependencies I have already made.
conda env create -f environment.yml

# 3. Activate your new virtual environment.
conda activate ee3180_backend
```
From here whenever working on the BE, always make sure your environment is set as the virtual env "ee3180." Once step 2 is complete, you can just activate it with step 3 anytime afterwards. If there are changes in the dependencies, I will let you know and you can just repeat step 2 again for the re-installation.


## GITHUB USAGE
I have made branches with each members' name on it. Work on that branch, and if you want to merge any changes to the main branch, send a Pull Request.
I highly recommend that everyone download GitHub Desktop, since it allows easier use of GitHub with User Interface.
Using GitHub at first will be quite complex, so please use ChatGPT to solve issues.
If you can't solve the issue with CHATGPT, then ask me for help.


## API KEYS and DOTENV FILES
Since we are dealing with several API keys, we should not be hard coding them into our codes. The way to deal with this is by creating your own .env file in either the backend/ directory or frontend/ directory respectively.
Since .env files are included in .gitignore, they will automatically be excluded from being added to the brach when you commit, so no worries!
There is a .env.example file I made for your reference on how .env file should look like.

#### API and SECRET Keys Responsibilities
1. Remove.bg: Bryan
2. OpenAI: Hyukjin, Chance
3. AWS: Meng Chun

---
_Written by Yoon Hyukjin_