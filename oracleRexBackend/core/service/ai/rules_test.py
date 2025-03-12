#todo: delete when testable through frontend
import requests

def test_rule_chatbot():
    url = 'http://127.0.0.1:8000/api/rules-chat/'
    data = {'question': 'If another player moves a ship through a system adjacent to my PDS, and my pds is upgraded, can I fire at their ship?'}
    response = requests.post(url, json=data)
    print(response.json())