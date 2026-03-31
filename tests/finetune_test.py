import pandas as pd, os, json
from pipelines.nlp.pipeline import FinetuneNLPPipeline

temp_path = 'temp_dataset.csv'
# create minimal dataset
pd.DataFrame({
    'text': ['Hello world', 'Goodbye world'],
    'label': [0, 1]
}).to_csv(temp_path, index=False)

pipeline = FinetuneNLPPipeline()
result = pipeline.fine_tune(dataset_path=temp_path, model_id='sshleifer/tiny-bert', method='lora', quantise=False, num_train_epochs=1)
print('Result:', result)
# cleanup
os.remove(temp_path)
