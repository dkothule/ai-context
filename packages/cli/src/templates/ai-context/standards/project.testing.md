# Testing Standards

## Testing Philosophy

1. **Write tests first** (TDD approach when feasible)
2. **Test behavior, not implementation**
3. **Keep tests simple and focused**
4. **Tests should be fast** (< 1 second per test ideally)
5. **Tests should be isolated** (no dependencies between tests)

## Test Organization

### Directory Structure
```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
├── fixtures/      # Test fixtures and data
└── conftest.py    # Shared pytest configuration
```

### File Naming
- Test files: `test_<module_name>.py`
- Test functions: `test_<function_name>_<scenario>`
- Test classes: `Test<ClassName>`

## Testing Levels

### Unit Tests
- Test individual functions/methods in isolation
- Mock external dependencies
- Fast execution (< 0.1s per test)
- High coverage of edge cases

### Integration Tests
- Test interaction between components
- May use real dependencies (databases, APIs)
- Medium execution time (< 5s per test)
- Focus on critical paths

### End-to-End Tests
- Test complete user workflows
- Use production-like environment
- Slower execution acceptable
- Cover main user journeys

## pytest Standards

### Test Structure (Arrange-Act-Assert)
```python
def test_calculate_total_with_tax():
    # Arrange
    items = [10.0, 20.0, 30.0]
    tax_rate = 0.08

    # Act
    result = calculate_total(items, tax_rate)

    # Assert
    assert result == 64.8
```

### Fixtures
```python
import pytest

@pytest.fixture
def sample_user():
    """Provide a sample user for tests."""
    return User(id=1, name="Test User", email="test@example.com")

def test_user_greeting(sample_user):
    assert sample_user.greeting() == "Hello, Test User!"
```

### Parametrize for Multiple Cases
```python
@pytest.mark.parametrize("input,expected", [
    (0, 0),
    (1, 1),
    (5, 120),
    (-1, ValueError),
])
def test_factorial(input, expected):
    if isinstance(expected, type) and issubclass(expected, Exception):
        with pytest.raises(expected):
            factorial(input)
    else:
        assert factorial(input) == expected
```

## Coverage Requirements

### Targets
- **Overall**: Minimum 80% coverage
- **New code**: Minimum 90% coverage
- **Critical paths**: 100% coverage

### Running Coverage
```bash
# Run tests with coverage
pytest --cov=src --cov-report=html --cov-report=term

# View HTML report
open htmlcov/index.html
```

### Coverage Configuration
```toml
[tool.coverage.run]
source = ["src"]
omit = ["*/tests/*", "*/migrations/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
]
```

## Mocking Standards

### When to Mock
- External APIs
- Databases (for unit tests)
- File system operations
- Time-dependent operations
- Expensive computations

### Using unittest.mock
```python
from unittest.mock import Mock, patch, MagicMock

def test_api_call():
    with patch('module.requests.get') as mock_get:
        mock_get.return_value.json.return_value = {'key': 'value'}
        result = fetch_data()
        assert result == {'key': 'value'}
        mock_get.assert_called_once()
```

## Test Data Management

### Fixtures Directory
```
tests/fixtures/
├── data/
│   ├── sample_input.json
│   └── expected_output.json
└── files/
    └── test_document.pdf
```

### Loading Test Data
```python
import json
from pathlib import Path

def load_fixture(filename):
    """Load test fixture data."""
    fixture_path = Path(__file__).parent / 'fixtures' / 'data' / filename
    with open(fixture_path) as f:
        return json.load(f)

def test_process_data():
    input_data = load_fixture('sample_input.json')
    expected = load_fixture('expected_output.json')
    result = process_data(input_data)
    assert result == expected
```

## Testing Best Practices

### DO
- ✅ Test edge cases and boundary conditions
- ✅ Test error handling and exceptions
- ✅ Use descriptive test names
- ✅ Keep tests independent
- ✅ Use fixtures for common setup
- ✅ Test one thing per test
- ✅ Mock external dependencies

### DON'T
- ❌ Test implementation details
- ❌ Write tests that depend on execution order
- ❌ Share state between tests
- ❌ Test framework code or third-party libraries
- ❌ Write tests that are slower than necessary
- ❌ Ignore failing tests
- ❌ Write tests without assertions

## CI/CD Integration

### Test Commands
```bash
# Run all tests
pytest

# Run specific test file
pytest tests/unit/test_module.py

# Run tests matching pattern
pytest -k "test_user"

# Run with coverage
pytest --cov=src

# Run with verbose output
pytest -v

# Run failed tests only
pytest --lf
```

### CI Configuration Example (.github/workflows/test.yml)
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      - name: Run tests
        run: pytest --cov=src --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Performance Testing

### For Critical Operations
```python
import time

def test_performance_calculate_large_dataset():
    """Ensure calculation completes in reasonable time."""
    large_dataset = list(range(100000))

    start = time.time()
    result = process_large_dataset(large_dataset)
    duration = time.time() - start

    assert duration < 1.0, f"Processing took {duration}s, expected < 1.0s"
```

## Database Testing

### Use Transactions
```python
@pytest.fixture
def db_session():
    """Provide database session with automatic rollback."""
    session = create_session()
    yield session
    session.rollback()
    session.close()
```

### Test Migrations
```python
def test_migration_up_and_down():
    """Ensure migrations are reversible."""
    # Apply migration
    migrate('up')
    # Verify schema changes
    assert table_exists('new_table')
    # Rollback
    migrate('down')
    # Verify rollback
    assert not table_exists('new_table')
```

## Documentation

Every test should be self-documenting:
- Clear, descriptive names
- Docstrings for complex tests
- Comments for non-obvious setup/assertions
