from backend.llm_predictor import LLMStockPredictor

llm_predictor = None

def get_llm_predictor():
    global llm_predictor
    if llm_predictor is None:
        llm_predictor = LLMStockPredictor()
        try:
            llm_predictor.load_model()
        except Exception as e:
            print(f"Warning: Could not load LLM model: {e}")
            llm_predictor = None
    return llm_predictor