# Contributing to Stock Analysis Dashboard

Thank you for your interest in contributing to the Stock Analysis Dashboard! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/stocks-react-dashboard.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit your changes: `git commit -m "Add your feature"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Setup

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Git

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Code Style

### Python (Backend)
- Follow PEP 8 style guidelines
- Use type hints where possible
- Add docstrings to functions and classes
- Use meaningful variable and function names

### TypeScript/React (Frontend)
- Use TypeScript for all new components
- Follow React best practices
- Use functional components with hooks
- Use Tailwind CSS for styling
- Add proper error handling and loading states

## Testing

- Add tests for new features
- Ensure existing tests pass
- Test both backend APIs and frontend components
- Test with different stock tickers and international markets

## Pull Request Guidelines

1. **Clear Description**: Provide a clear description of what your PR does
2. **Small Changes**: Keep PRs focused and reasonably sized
3. **Tests**: Include tests for new functionality
4. **Documentation**: Update documentation if needed
5. **Screenshots**: Include screenshots for UI changes

## Feature Ideas

- Additional forecasting algorithms
- More chart types and technical indicators
- Portfolio tracking features
- Real-time alerts and notifications
- Mobile app version
- Additional international markets
- Social sentiment analysis
- Options data integration

## Bug Reports

When reporting bugs, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Browser/OS information

## Questions?

Feel free to open an issue for questions or discussions about the project.

Thank you for contributing! 🚀
