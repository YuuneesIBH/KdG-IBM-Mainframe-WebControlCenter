from flask import Flask
from routes import init_routes
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__, 
            static_folder='../static',
            template_folder='../templates')

if os.environ.get('FLASK_ENV') == 'production':
    from config import ProductionConfig
    app.config.from_object(ProductionConfig)
else:
    from config import DevelopmentConfig
    app.config.from_object(DevelopmentConfig)

init_routes(app)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=6767)