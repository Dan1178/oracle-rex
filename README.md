# Oracle Rex

### Live Demo

Currently deployed at https://oracle-rex.onrender.com/

Oracle Rex is an AI-powered companion application for the board game Twilight Imperium. This application was built with a Python (Django) backend and a simple Javascript / HTML frontend, with Django static loading.
TTS Strings required for many functions of this application can be retrieved from a board generated with this tool: https://milty.shenanigans.be/
The following tabs make up all the functions of this application:
  
  - **Settings**: This tab allows the user to enter an api key for X AI and OpenAI. These keys are not stored in the backend.
  
    **Planned Features**: - Add additional LLM integrations, and give the user the ability to select LLMs for each tab.
                    - Allow the user to select between AI 'personalities'
  

  - **Rules Q&A**: A text chatbot that can answer questions about TI rules. Prompt has been tweaked to make the response more to-the-point.
  
    **Planned Features**: - Allow the user to check a box for a more verbose, beginner-friendly response.


  - **Strategy Suggester**: Accepts a TTS String to recreate a board and allows the user to select a faction to get overall strategy advice for.
  
    **Planned Features**: - Allow the user to select what stages of the game to get strategies for, i.e. first turn, mid-game, etc.
                      - Stylize / better format for the AI response.


  - **Fleet Manager**: This tab builds a board state for use with the Move Suggester. Like the Strategy tab, it accepts a TTS String to build a board.
  It then allows the user to click each individual tile and add units for a given player to the system and any planets within the system.
  Once complete, the user can export this board state to the move suggester. The board state json can be copied to clipboard, saved in a .json file, or uploaded from a .json file.
  
    **Planned Features**: - JSON validation
                      - Allow a user to copy and paste fleets between tiles
                      - Once ships are added to a tile, have the tile display the player number the fleet belongs to and the number of ships in the tile.


  - **Move Suggester**: This tab accepts a board state from the Fleet Manager and allows the user to get a suggestion for the next move for a given player.
  
    **Planned Features**: - Parse the AI response to determine tiles being mentioned, and highlight those tiles once a response is received.
                    - Stylize / better format for the AI response.
    

  - **Tactical Calculator**: This tab allows a user to build a fleet for a friendly and enemy player. The user can then get an AI assessment of the odds of victory for the attacker,
  plus the minimum (50% odds of success) and recommended (80+% odds of success) fleet composition for the attack.
  User has the option of including ground units to calculate odds for taking the planet as well.
  
    **Planned Features**: - Stylize / better format for the AI response.

Currently, this application supports the 4th Edition of the game with the Prophecy of Kings expansion, 6-player board only.

## To Run Locally:

Execute the following commands to install dependencies:

    python -m pip install --upgrade pip
    pip install -r requirements.txt

Execute the following command to generate static files:

    python manage.py collectstatic

After the above steps have been completed, you can run the application locally by executing:

    python manage.py runserver

## Deployment:

This application automatically deploys on Render when a successful build runs on the main branch.
See CI.yml for details.

## LLMs in Use:
    - grok-3-latest
    - gpt-4