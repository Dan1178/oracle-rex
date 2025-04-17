from langchain_openai.chat_models import ChatOpenAI
from langchain_xai import ChatXAI

def invoke_openai(model_name, api_key, max_tokens, message_payload):
    chat = ChatOpenAI(model_name=model_name, temperature=0, api_key=api_key, max_tokens=max_tokens)
    response = chat.invoke(message_payload)
    return response.content

def invoke_xai(model_name, api_key, max_tokens, message_payload):
    chat = ChatXAI(model_name=model_name, temperature=0, api_key=api_key, max_tokens=max_tokens)
    response = chat.invoke(message_payload)
    return response.content