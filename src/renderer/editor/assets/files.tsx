import { shell } from "electron";
import { join, extname, dirname } from "path";
import { copy } from "fs-extra";
import * as os from "os";

import * as React from "react";
import { ButtonGroup, Button, Classes, Divider, ContextMenu, Menu, MenuItem, MenuDivider } from "@blueprintjs/core";

import { Project } from "../project/project";
import { IFile, FilesStore } from "../project/files";

import { Icon } from "../gui/icon";

import { Tools } from "../tools/tools";

import { Assets } from "../components/assets";
import { AbstractAssets, IAssetComponentItem } from "./abstract-assets";

export class FileAssets extends AbstractAssets {
    /**
     * Defines the size of assets to be drawn in the panel. Default is 100x100 pixels.
     * @override
     */
    protected size: number = 50;

    private _extensions: string[] = [".json"];

    /**
     * Registers the component.
     */
    public static Register(): void {
        Assets.addAssetComponent({
            title: "Files",
            identifier: "files",
            ctor: FileAssets,
        });
    }

    /**
     * Renders the component.
     */
    public render(): React.ReactNode {
        const node = super.render();

        return (
            <>
                <div className={Classes.FILL} key="files-toolbar" style={{ width: "100%", height: "25px", backgroundColor: "#333333", borderRadius: "10px", marginTop: "5px" }}>
                    <ButtonGroup>
                        <Button key="refresh-folder" icon="refresh" small={true} onClick={() => this.refresh()} />
                        <Divider />
                        <Button key="add-files" icon={<Icon src="plus.svg" />} small={true} text="Add..." onClick={() => this._addFile()} />
                        <Divider />
                    </ButtonGroup>
                </div>
                {node}
            </>
        );
    }

    /**
     * Refreshes the component.
     * @override
     */
    public async refresh(): Promise<void> {
        for (const s of Object.values(FilesStore.List)) {
            if(s.path.indexOf(".json") >= 0)
            {
                const item = this.items.find((i) => i.key === s.path);
                if (item) { continue; }

                this.items.push({ key: s.path, id: s.name, base64: "../css/svg/file.svg" });
            }
        }

        return super.refresh();
    }

    /**
     * Called once a project has been loaded, this function is used to clean up
     * unused assets files automatically.
     */
    public async clean(): Promise<void> {        
    }

    /**
     * Called on the user drops files in the assets component and returns true if the files have been computed.
     * @param files the list of files being dropped.
     */
    public async onDropFiles(files: IFile[]): Promise<void> {
        for (const file of files) {
            const extension = extname(file.name).toLowerCase();
            if (this._extensions.indexOf(extension) === -1) { continue; }

            // Register file
            const path = join(Project.DirPath!, "files", file.name);
            FilesStore.List[path] = { path, name: file.name };

            // Copy assets
            const dest = join(Project.DirPath!, "files", file.name);
            if (dest) { await copy(file.path, dest); }
        }
    }

    /**
     * Called on the user drops an asset in editor. (typically the preview canvas).
     * @param item the item being dropped.
     * @param pickInfo the pick info generated on the drop event.
     * @override
     */
    public onDropAsset(): void {

    }

    /**
     * Called on the user double clicks an item.
     * @param item the item being double clicked.
     * @param img the double-clicked image element.
     */
    public async onDoubleClick(item: IAssetComponentItem, img: HTMLImageElement): Promise<void> {
        super.onDoubleClick(item, img);
    }

    /**
     * Called on the user right-clicks on an item.
     * @param item the item being right-clicked.
     * @param event the original mouse event.
     */
    public onContextMenu(item: IAssetComponentItem, e: React.MouseEvent<HTMLImageElement, MouseEvent>): void {
        super.onContextMenu(item, e);        
        
        if (!FilesStore.GetFileFromPath(item.key)) { return; }

        const platform = os.platform();
        const explorer = platform === "darwin" ? "Finder" : "File Explorer";

        ContextMenu.show(
            <Menu className={Classes.DARK}>
                <MenuItem text={`Show in ${explorer}`} icon="document-open" onClick={() => {
                    const file = FilesStore.GetFileFromPath(item.key);
                    if (file) { shell.openItem(dirname(file.path)); }
                }} />
                <MenuDivider />
                <MenuItem text="Remove" icon={<Icon src="times.svg" />} onClick={() => this._removeFile(item)} />
            </Menu>,
            { left: e.clientX, top: e.clientY },
        );
    }

    /**
     * Called on the user pressed the delete key on the asset.
     * @param item defines the item being deleted.
     */
    public onDeleteAsset(item: IAssetComponentItem): void {
        super.onDeleteAsset(item);
        this._removeFile(item); 
    }

    /**
     * Called on the user wants to add textures.
     */
    private async _addFile(): Promise<void> {
        const files = await Tools.ShowNativeOpenMultipleFileDialog();
        await this.onDropFiles(files);
        return this.refresh();
    }

    /**
     * Removes the given sound.
     */
    private _removeFile(item: IAssetComponentItem): void {
        const index = this.items.indexOf(item);
        console.log(index);
        if (index !== -1) {
            this.items.splice(index, 1);
        }

        FilesStore.RemoveFileFromPath(item.key);

        this.refresh();
        this.editor.graph.refresh();
    }    
}
