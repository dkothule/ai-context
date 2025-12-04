# Python Coding Standards

## Style Guide

### General
- **Follow PEP 8** for all Python code
- **Line Length**: Maximum 88 characters (Black formatter default)
- **Indentation**: 4 spaces (no tabs)
- **Encoding**: UTF-8
- **Quotes**: Prefer double quotes for strings, single quotes for string literals in code

### Type Hints
- **Required** for all function signatures
- Use `typing` module for complex types
- Example:
  ```python
  from typing import List, Dict, Optional

  def process_data(items: List[str], config: Optional[Dict[str, any]] = None) -> bool:
      pass
  ```

### Docstrings
- **Style**: Google style docstrings
- **Required for**: All public modules, classes, functions, and methods
- **Example**:
  ```python
  def calculate_total(items: List[float], tax_rate: float = 0.0) -> float:
      """Calculate the total cost including tax.

      Args:
          items: List of item prices
          tax_rate: Tax rate as decimal (e.g., 0.08 for 8%)

      Returns:
          Total cost with tax applied

      Raises:
          ValueError: If tax_rate is negative
      """
      pass
  ```

## Import Organization

### Order
1. Standard library imports
2. Related third-party imports
3. Local application/library imports

### Style
- One import per line for `from` imports
- Grouped and alphabetically sorted within each group
- Separate groups with blank line

### Example
```python
# Standard library
import os
import sys
from pathlib import Path

# Third-party
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException

# Local
from app.core.config import settings
from app.models.user import User
```

## Naming Conventions

### General Rules
- **Classes**: `PascalCase`
- **Functions**: `snake_case`
- **Variables**: `snake_case`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private/Internal**: `_leading_underscore`
- **Strongly Private**: `__double_leading_underscore`

### Examples
```python
# Constants
MAX_RETRIES = 3
API_TIMEOUT = 30

# Classes
class UserManager:
    pass

# Functions
def calculate_total():
    pass

# Variables
user_count = 0
is_active = True

# Private
_internal_cache = {}
```

## Code Organization

### File Structure
```python
"""Module docstring."""

# Imports (organized as above)

# Constants
MAX_SIZE = 1000

# Module-level variables
_cache = {}

# Classes
class MyClass:
    pass

# Functions
def my_function():
    pass

# Main execution
if __name__ == "__main__":
    pass
```

### Class Structure
```python
class MyClass:
    """Class docstring."""

    # Class variables
    class_var = "value"

    def __init__(self):
        """Initialize instance."""
        self.instance_var = "value"

    # Public methods
    def public_method(self):
        pass

    # Private methods
    def _private_method(self):
        pass

    # Special methods
    def __str__(self):
        pass
```

## Best Practices

### General
1. **One class per file** (unless closely related)
2. **Keep functions small** (< 50 lines ideally)
3. **Avoid deep nesting** (max 3-4 levels)
4. **Use list/dict comprehensions** for simple transformations
5. **Prefer explicit over implicit**

### Error Handling
```python
# Good: Specific exceptions
try:
    result = risky_operation()
except ValueError as e:
    logger.error(f"Invalid value: {e}")
    raise
except IOError as e:
    logger.error(f"IO error: {e}")
    return None

# Avoid: Bare except
try:
    result = risky_operation()
except:  # Don't do this
    pass
```

### Context Managers
```python
# Good: Use context managers for resources
with open('file.txt', 'r') as f:
    data = f.read()

# Good: Custom context managers for cleanup
with database.transaction():
    database.insert(data)
```

## Tools and Automation

### Required Tools
- **Formatter**: `black` (88 char line length)
- **Linter**: `ruff` (replaces flake8, isort, etc.)
- **Type Checker**: `mypy` (strict mode)
- **Testing**: `pytest`
- **Coverage**: `pytest-cov`

### Configuration Files

#### pyproject.toml
```toml
[tool.black]
line-length = 88
target-version = ['py311']

[tool.ruff]
line-length = 88
select = ["E", "F", "I", "N", "W"]
ignore = []

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
```

### Pre-commit Hook (optional)
```bash
#!/bin/bash
black .
ruff check .
mypy .
pytest
```

## Testing Standards

See `project.testing.md` for detailed testing guidelines.

## Performance Considerations

1. **Use generators** for large datasets
2. **Profile before optimizing** (use `cProfile`)
3. **Cache expensive operations** (use `functools.lru_cache`)
4. **Use appropriate data structures** (dict for lookups, set for membership)
5. **Lazy imports** for heavy dependencies (import inside function if only sometimes needed)

## Security

1. **Never hardcode credentials**
2. **Validate all external input**
3. **Use parameterized queries** (prevent SQL injection)
4. **Sanitize user-provided data**
5. **Keep dependencies updated**

## Documentation

1. **README.md** at package level
2. **Docstrings** for all public APIs
3. **Type hints** for clarity
4. **Examples** in docstrings for complex functions
5. **Architecture docs** in `docs/` for system design
