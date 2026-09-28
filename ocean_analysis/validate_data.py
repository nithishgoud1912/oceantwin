"""Read-only inventory of actual catalog and normalized observations."""
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from scientific_data import catalog
if __name__ == '__main__':
    result=catalog.summary()
    result['instruments']=catalog.fleet('all')
    print(json.dumps(result,indent=2))
