from flask import Flask, render_template, request
from datetime import datetime
from flask_socketio import SocketIO, emit, send
# para los permisos
from flask_cors import CORS
import threading

#inicializar la aplicacion flask
app = Flask(__name__)
app.config['SECRET_KEY'] = 'mi_clave_secreta'
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*")

usuarios = {}

messages_db = {}

temp_messages_db = {}

@app.route("/")
def index():
    return render_template("index.html")

#evento para manejar la conexion de un nuevo client
@socketio.on("connect")
def handle_connect():
    print(f'Nuevo cliente conectado {request.sid}')

@socketio.on("set_username")
def handle_set_username(data):
    username = data.get('username')
    usuarios[request.sid] = username
    emit("user_joined", {"username": username}, broadcast=True, include_self=False)
    emit("user_list", {"users": list(usuarios.values())}, broadcast=True)

@socketio.on("chat_message")
def handle_chat_message(data):
    username = usuarios.get(request.sid)
    message_id = data.get("messageId")
    messages_db[message_id] = {
        "message": data.get("message"),
        "user": usuarios.get(request.sid),
        "timestamp": data.get("timeStamp"),
        "read": False,
        "read_by": []
    }

    emit("chat_message", {
        "message_id": message_id,
        "message": data.get("message"),
        "username": usuarios.get(request.sid),
        "timeStamp": data.get("timeStamp")
    }, broadcast=True)

@socketio.on("disconnect")
def handle_disconnect():
    username = usuarios.pop(request.sid)
    print(f"Usuario desconectado: {request.sid} ({username})")
    emit("user_left", {"username": username}, broadcast=True)
    emit("user_list", {"users": list(usuarios.values())}, broadcast=True)

@socketio.on("message_read")
def handle_message_read(data):
    username = usuarios.get(request.sid)
    message_id = data.get("messageId")

    if message_id in messages_db:
        messages_db[message_id]["read_by"].append(username)
        messages_db[message_id]["read"] = True

    emit("message_read_confirmation", {"messageId": message_id, "username": username}, broadcast=True)

@socketio.on("temp_message")
def handle_temp_message(data):
    message_id = f"temp_{request.sid}_{datetime.now().timestamp()}"

    duration = data.get("duration", 10)

    temp_messages_db[message_id] = {
        "message": data.get("message"),
        "user": usuarios.get(request.sid),
        "timestamp": data.get("timeStamp"),
        "duration": duration,
        "read": False,
        "timer": None
    }

    emit("temp_message", {
        "message_id": message_id,
        "message": data.get("message"),
        "username": usuarios.get(request.sid),
        "timeStamp": data.get("timeStamp"),
        "duration": duration
    }, broadcast=True)

@socketio.on("delete_temp_message")
def handle_delete_temp_message(data):
    message_id = data.get("messageId")

    if message_id in temp_messages_db and not temp_messages_db[message_id]["read"]:
        temp_messages_db[message_id]["read"] = True
        duration = temp_messages_db[message_id]["duration"]

        def countdown():
            for i in range(duration, 0, -1):
                if message_id in temp_messages_db:
                    socketio.emit("temp_message_countdown", {"messageId": message_id, "remaining": i - 1}, broadcast=True)
                    socketio.sleep(1)
                
            if message_id in temp_messages_db:
                del temp_messages_db[message_id]
                socketio.emit("temp_message_deleted", {"messageId": message_id}, broadcast=True)
        
        timer_thread = threading.Thread(target=countdown, daemon=True)
        timer_thread.start()
        temp_messages_db[message_id]["timer"] = timer_thread

if __name__ == "__main__":
    socketio.run(app, host="localhost", port=5000, debug=True)
