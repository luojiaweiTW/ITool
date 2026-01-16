# Requirements Document

## Introduction

SFTP 文件管理器是一个双面板文件管理工具，支持本地文件系统和远程 SSH 服务器之间的文件浏览和传输。用户可以在左右两个面板中分别选择本地或远程数据源，通过拖拽或按钮操作实现文件的双向复制、删除、重命名等操作。

## Glossary

- **File_Manager**: SFTP 文件管理器工具，提供双面板文件操作界面
- **Panel**: 文件面板，可配置为本地或远程数据源
- **Local_Source**: 本地文件系统数据源
- **Remote_Source**: 通过 SSH/SFTP 连接的远程服务器数据源
- **File_Item**: 文件或文件夹条目，包含名称、大小、修改时间、类型等属性
- **Transfer_Operation**: 文件传输操作，包括复制文件/文件夹
- **Connection_Config**: SSH 连接配置，包含主机、端口、用户名、认证信息

## Requirements

### Requirement 1: 双面板布局

**User Story:** As a user, I want to see two file panels side by side, so that I can easily compare and transfer files between different locations.

#### Acceptance Criteria

1. THE File_Manager SHALL display two panels (left and right) side by side with equal width
2. WHEN the File_Manager loads, THE File_Manager SHALL default both panels to Local_Source
3. THE File_Manager SHALL display a source selector at the top of each Panel allowing switch between Local_Source and Remote_Source
4. WHEN a Panel is set to Remote_Source without an active connection, THE Panel SHALL display a connection prompt

### Requirement 2: 数据源切换

**User Story:** As a user, I want to switch each panel between local and remote sources, so that I can flexibly manage files across different locations.

#### Acceptance Criteria

1. WHEN user selects Local_Source for a Panel, THE Panel SHALL display the local file system starting from a default directory
2. WHEN user selects Remote_Source for a Panel, THE Panel SHALL prompt for SSH connection if not already connected
3. WHEN user connects to a Remote_Source, THE File_Manager SHALL save the connection to history for quick reconnection
4. THE File_Manager SHALL support multiple simultaneous Remote_Source connections (one per panel)
5. WHEN user switches a Panel from Remote_Source to Local_Source, THE File_Manager SHALL maintain the remote connection for potential reuse

### Requirement 3: 文件浏览

**User Story:** As a user, I want to browse files and folders in each panel, so that I can navigate to the files I need.

#### Acceptance Criteria

1. THE Panel SHALL display File_Items in a list with columns: Name, Size, Modified Date, Type
2. WHEN user clicks a folder, THE Panel SHALL navigate into that folder and display its contents
3. WHEN user clicks the parent directory indicator (..), THE Panel SHALL navigate to the parent folder
4. THE Panel SHALL display a breadcrumb path showing the current directory location
5. WHEN user enters a path in the breadcrumb input, THE Panel SHALL navigate to that path
6. THE Panel SHALL display a loading indicator while fetching directory contents
7. IF directory loading fails, THEN THE Panel SHALL display an error message with retry option

### Requirement 4: 文件选择

**User Story:** As a user, I want to select files and folders, so that I can perform operations on them.

#### Acceptance Criteria

1. WHEN user clicks a File_Item, THE Panel SHALL select that item and highlight it
2. WHEN user Ctrl+clicks a File_Item, THE Panel SHALL toggle selection of that item (multi-select)
3. WHEN user Shift+clicks a File_Item, THE Panel SHALL select all items between the last selected item and the clicked item
4. THE Panel SHALL display the count of selected items in the status bar
5. WHEN user clicks empty area, THE Panel SHALL clear all selections

### Requirement 5: 文件复制（跨面板传输）

**User Story:** As a user, I want to copy files from one panel to another, so that I can transfer files between local and remote locations.

#### Acceptance Criteria

1. WHEN user selects files and clicks the copy-to-right button, THE File_Manager SHALL copy selected files from left Panel to right Panel's current directory
2. WHEN user selects files and clicks the copy-to-left button, THE File_Manager SHALL copy selected files from right Panel to left Panel's current directory
3. WHEN copying files, THE File_Manager SHALL display a progress indicator showing transfer status
4. WHEN copying a folder, THE File_Manager SHALL recursively copy all contents
5. IF a file with the same name exists at destination, THEN THE File_Manager SHALL prompt user to overwrite, skip, or rename
6. WHEN copy completes, THE File_Manager SHALL refresh the destination Panel to show new files
7. IF copy fails, THEN THE File_Manager SHALL display an error message and allow retry

### Requirement 6: 文件删除

**User Story:** As a user, I want to delete files and folders, so that I can remove unwanted items.

#### Acceptance Criteria

1. WHEN user selects files and clicks delete button, THE File_Manager SHALL prompt for confirmation
2. WHEN user confirms deletion, THE File_Manager SHALL delete the selected files
3. WHEN deleting a folder, THE File_Manager SHALL recursively delete all contents
4. WHEN deletion completes, THE File_Manager SHALL refresh the Panel to reflect changes
5. IF deletion fails, THEN THE File_Manager SHALL display an error message

### Requirement 7: 文件重命名

**User Story:** As a user, I want to rename files and folders, so that I can organize my files better.

#### Acceptance Criteria

1. WHEN user selects a single file and clicks rename (or presses F2), THE Panel SHALL show an inline editor for the filename
2. WHEN user confirms the new name, THE File_Manager SHALL rename the file
3. IF the new name already exists, THEN THE File_Manager SHALL display an error and keep the editor open
4. WHEN user presses Escape, THE Panel SHALL cancel the rename operation
5. WHEN rename completes, THE Panel SHALL refresh to show the updated name

### Requirement 8: 新建文件夹

**User Story:** As a user, I want to create new folders, so that I can organize my files.

#### Acceptance Criteria

1. WHEN user clicks the new folder button, THE Panel SHALL create a new folder with a default name in the current directory
2. THE Panel SHALL immediately enter rename mode for the new folder
3. IF folder creation fails, THEN THE File_Manager SHALL display an error message

### Requirement 9: 连接管理

**User Story:** As a user, I want to manage my SSH connections, so that I can quickly connect to frequently used servers.

#### Acceptance Criteria

1. THE File_Manager SHALL reuse SSH connection history from the existing SSH tool
2. WHEN user selects a saved connection, THE File_Manager SHALL connect using the saved credentials
3. WHEN user creates a new connection, THE File_Manager SHALL offer to save it to history
4. THE File_Manager SHALL support both password and key-based authentication
5. WHEN a connection is lost, THE File_Manager SHALL display a disconnected state and offer reconnection

### Requirement 10: 右键菜单

**User Story:** As a user, I want to access file operations through a context menu, so that I can quickly perform actions.

#### Acceptance Criteria

1. WHEN user right-clicks a File_Item, THE Panel SHALL display a context menu with available operations
2. THE context menu SHALL include: Copy, Delete, Rename, Refresh, New Folder
3. WHEN user right-clicks empty area, THE Panel SHALL display a context menu with: Refresh, New Folder, Paste (if clipboard has files)
