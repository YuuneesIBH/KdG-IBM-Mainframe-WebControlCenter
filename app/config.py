import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    MOCK_MODE = os.environ.get('MOCK_MODE', 'True') == 'True'
    ZOS_HOST = os.environ.get('ZOS_HOST')
    ZOS_PORT = os.environ.get('ZOS_PORT')
    ZOS_USER = os.environ.get('ZOS_USER')
    
    @classmethod
    def validate(cls):
        required = ['SECRET_KEY', 'ZOS_HOST', 'ZOS_PORT', 'ZOS_USER']
        missing = [key for key in required if not os.environ.get(key)]
        
        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}\n"
                f"Please check your .env file!"
            )

class DevelopmentConfig(Config):
    DEBUG = True
    MOCK_MODE = True

class ProductionConfig(Config):
    DEBUG = False
    MOCK_MODE = False