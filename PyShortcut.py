import tkinter as tk
from tkinter import filedialog, messagebox
import os
import winshell
from win32com.client import Dispatch
from tkinter import ttk


class ToolTip:
    """
    Create a tooltip for a given widget.
    """

    def __init__(self, widget, text):
        self.widget = widget
        self.text = text
        self.tip_window = None

    def show_tip(self):
        "Display the tooltip"
        if self.tip_window or not self.text:
            return
        x, y, _, _ = self.widget.bbox("insert")
        x += self.widget.winfo_rootx() + 25
        y += self.widget.winfo_rooty() + self.widget.winfo_height() + 5
        self.tip_window = tw = tk.Toplevel(self.widget)
        tw.wm_overrideredirect(1)
        tw.wm_geometry("+%d+%d" % (x, y))
        label = tk.Label(tw, text=self.text, justify=tk.LEFT,
                         background="#ffffe0", relief=tk.SOLID, borderwidth=1,
                         font=("tahoma", "8", "normal"))
        label.pack(ipadx=1)

    def hide_tip(self):
        "Hide the tooltip"
        tw = self.tip_window
        self.tip_window = None
        if tw:
            tw.destroy()

    def update_tip_position(self, x, y):
        "Update the tooltip position"
        tw = self.tip_window
        if tw:
            tw.wm_geometry("+%d+%d" % (x, y))


def create_shortcut():
    # Get the path of the selected file
    filepath = filedialog.askopenfilename()

    if filepath:
        # Determine the target directory
        if same_dir_var.get() == 1:
            target_dir = os.path.dirname(filepath)
        elif programs_var.get() == 1:
            target_dir = os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs')
        else:
            target_dir = os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')

        # Create the shortcut
        shell = Dispatch('WScript.Shell')
        shortcut_name = os.path.splitext(os.path.basename(filepath))[0]  # Exclude the file extension from the shortcut name
        shortcut_path = os.path.join(target_dir, shortcut_name + shortcut_format.get())
        if shortcut_format.get() == '.bat':
            with open(shortcut_path, 'w') as f:
                f.write('@echo off\nstart /d "{}" {}'.format(os.path.dirname(filepath), os.path.basename(filepath)))
        else:
            shortcut = shell.CreateShortCut(shortcut_path)
            shortcut.Targetpath = filepath
            shortcut.WorkingDirectory = os.path.dirname(filepath)
            shortcut.save()

        # Show success or error message
        if os.path.isfile(shortcut_path):
            messagebox.showinfo("Success", "Shortcut created successfully.")
        else:
            messagebox.showerror("Error", "Failed to create shortcut.")
    else:
        # Show error message if no file is selected
        messagebox.showerror("Error", "No file selected.")


# Create the GUI window
root = tk.Tk()
root.title("Create Shortcut")

# Add a button to select a file and create the shortcut
select_file_button = tk.Button(root, text="Select an exe or script", command=create_shortcut)
select_file_button.pack(padx=10, pady=10)

# Add check buttons and a dropdown to select the target directory and shortcut format
same_dir_var = tk.IntVar(value=0)
same_dir_checkbutton = tk.Checkbutton(root, text="Create shortcut in the same directory as the exe or script", variable=same_dir_var, onvalue=1, offvalue=0)
same_dir_checkbutton.pack(padx=10, pady=5, anchor='w')

programs_var = tk.IntVar(value=1)
programs_checkbutton = tk.Checkbutton(root, text="Create shortcut in the Programs directory of the Start Menu", variable=programs_var, onvalue=1, offvalue=0)
programs_checkbutton.pack(padx=10, pady=5, anchor='w')
startup_checkbutton = tk.Checkbutton(root, text="Create shortcut in the Startup directory of the Start Menu", variable=programs_var, onvalue=2, offvalue=0)
startup_checkbutton.pack(padx=10, pady=5, anchor='w')

shortcut_format_options = (".lnk", ".vbs", ".bat")
shortcut_format = tk.StringVar(value=".lnk")
shortcut_format_dropdown = ttk.Combobox(root, textvariable=shortcut_format, values=shortcut_format_options)
shortcut_format_dropdown.pack(padx=10, pady=5, anchor='w')

# Create tooltips for the shortcut format dropdown options
tooltip_options = ("Shortcut (.lnk) - Standard Windows shortcut format",
                   "VBScript (.vbs) - Windows script file format",
                   "Batch (.bat) - Windows batch file format")
tooltips = [ToolTip(shortcut_format_dropdown, text) for text in tooltip_options]
tooltip_index = shortcut_format_options.index(shortcut_format.get())
tooltip_visible = False

def show_tooltip(event):
    global tooltip_index, tooltip_visible
    tooltip_index = shortcut_format_options.index(shortcut_format.get())
    tooltip_visible = True
    tooltips[tooltip_index].show_tip()

def hide_tooltip(event):
    global tooltip_index, tooltip_visible
    tooltip_visible = False
    tooltips[tooltip_index].hide_tip()

def update_tooltip_position(event):
    if tooltip_visible:
        x, y, _, _ = shortcut_format_dropdown.bbox("insert")
        x += shortcut_format_dropdown.winfo_rootx() + 25
        y += shortcut_format_dropdown.winfo_rooty() + shortcut_format_dropdown.winfo_height() + 5
        tooltips[tooltip_index].update_tip_position(x, y)

shortcut_format_dropdown.bind("<<ComboboxSelected>>", show_tooltip)
shortcut_format_dropdown.bind("<Leave>", hide_tooltip)
shortcut_format_dropdown.bind("<Motion>", update_tooltip_position)

# Create a tooltip for the shortcut format dropdown menu
shortcut_format_label = ttk.Label(root, text="Shortcut format:")
shortcut_format_label.pack(padx=10, pady=5, anchor='w')
shortcut_format_tooltip = ToolTip(shortcut_format_label, "Select the format for the shortcut.")

root.mainloop()

