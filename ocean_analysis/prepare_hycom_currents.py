"""Export only currents with shared timestamps and depth levels."""
import sys
from ingest import main
if __name__ == '__main__': main(['currents', *sys.argv[1:]])
