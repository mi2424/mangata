| Feature/Functionality                     | TG (Original)            | TG-2 (Updated/Refactored)         | Notes/Comments                                             |
|-------------------------------------------|--------------------------|-----------------------------------|------------------------------------------------------------|
| **Account/session management**            | Yes                      | Yes                               | Modularized in TG-2 (`session.py`, class-based)            |
| Add account                              | Yes                      | Yes                               | Now via CLI & modular handler                              |
| List accounts                            | Yes                      | Yes                               | Via session/account handler                                |
| Delete account                           | Yes                      | Yes                               | Modular, improved logic                                    |
| Edit account/profile                     | Yes                      | Yes                               | Modularized, uses profile config files                     |
| **Proxy management**                      | Yes                      | Yes                               | Now async, via `utils/proxy.py`                            |
| Check proxies                            | Yes                      | Yes                               | Async, more robust, better error handling                  |
| **Configuration management**              | Yes                      | Yes                               | Class-based config manager                                 |
| Load/save config                         | Yes                      | Yes                               | Via `ConfigManager`                                        |
| Edit config via CLI                      | Yes                      | Yes                               | Modular, improved prompts                                  |
| **Group management**                      | Yes                      | Yes                               | Group logic in handler modules in TG-2                     |
| Join group                               | Yes                      | Yes                               | Via group handler class                                    |
| List joined groups                       | Yes                      | Yes                               | Modular, improved stats                                    |
| Handle banned/waiting groups             | Yes                      | Yes                               | Now tracked in separate modules                            |
| **Messaging**                             | Yes                      | Yes                               | MessageHandler class, modular                              |
| Send message to group                    | Yes                      | Yes                               | Modular, split by handler                                  |
| Auto-reply to private messages           | Yes                      | Yes                               | Now in event handler                                       |
| Reaction to messages                     | Yes                      | Yes                               | ReactionHandler class, improved                            |
| **Spam settings & rate limiting**         | Yes                      | Yes                               | Configurable, improved with dataclasses                    |
| Display/edit spam settings               | Yes                      | Yes                               | Improved CLI, config manager                               |
| **Device/system info**                    | Yes                      | Yes                               | Modularized, more info via `types.py`                      |
| Show device info                         | Yes                      | Yes                               | Extended to system and session stats                       |
| **Logging and error handling**            | Yes                      | Yes                               | Now more robust, centralized in `logging.py`               |
| Log to file                              | Yes                      | Yes                               | Improved rotation, formatting                              |
| Error reporting                          | Basic                    | Advanced                          | ErrorHandler class, more detailed logs                     |
| **Backup system**                         | No                       | Yes                               | New in TG-2, automated & manual backup support             |
| **Scheduler/task automation**             | No                       | Yes                               | New in TG-2, supports periodic/recurring tasks             |
| **Metrics/statistics**                    | Basic                    | Advanced                          | TG-2 has metrics collection modules                        |
| **Dependency checking**                   | Minimal                  | Yes                               | Automated, CLI checks in `run.py`, with helpful errors     |
| **Startup/CLI checks**                    | Minimal                  | Extensive                         | TG-2 checks Python version, files, directories, dependencies|
| **Testing support**                       | Minimal/None             | Improved                          | `tests/` folder, pytest-style tests                        |
| **Modularity/code structure**             | Monolithic               | Highly modular                    | Classes, helpers, handlers, types, config, etc.            |
| **Configuration files validation**        | Basic/manual             | Automated                         | Checks for required config files at startup                |
| **System status/statistics**              | No                       | Yes                               | Via `system_status.py`, `metrics.py`                       |
| **Extensibility**                         | Limited                  | Yes                               | Designed for new handlers, plugins, automated tasks        |