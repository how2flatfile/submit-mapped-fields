# Getting Started

## For visual learners

If you want to just follow the video on how to get everything done, [here is a Loom video](https://www.loom.com/share/3c84b02d2dc1417eb390990da2284341?sid=ffe81805-94ca-4e98-84f8-9529624650be) for you.

**IMPORTANT -** If you follow the video above to get everything set up, the information below ***is still valuable to you***. 

I recommend you read through it.


## Step-by-step instructions

*The instructions below are intentionally very detailed and descriptive to help any developer, regardless of their skill level.*

### Basics
- [Click this link](https://github.com/how2flatfile/submit-mapped-fields) to access the repository.  

- Make sure that you are looking at the branch called `main`.  

- Click on the green button that says `<> Code`, and copy the URL.  

- Open your IDE, and clone the repository using the URL you just copied.  

- Save the project on your computer (I prefer to save on the Desktop while I test).  

### Code Setup (valuable information for anyone)

- Open the project that you just saved on your computer. Open `index.ts` file.

- On line 7, replace existing link inside `webhookReceiver` with your unique URL.
  - Go to https://webhook.site/ , and copy `Your unique URL` from there.

- Open the terminal, and run the command `npm install`

- Run `npm outdated`. If any Flatfile-related packages are not on the latest, update them to be on the latest.
  - If you do update to the latest, after you do so, run `npm outdated` again to ensure update completed.

- Run `npx flatfile@latest deploy`. For authentication, I prefer to select `API Key`.
  - If you also select `API Key`, copy your `Secret Key` from your Flatfile dashboard.

- Click enter, and confirm that terminal says `Event listener deployed and running ...` .