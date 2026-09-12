# Mac ↔ Dell GB10 USB-C transfer

Wi-Fi rsync between the Mac and the Dell Pro Max sits at about **1–2 MB/s**. A USB-C cable is the fast path. Thunderbolt host-to-host will not come up: the Dell Type-C ports are **USB 3.2 Gen 2x2 (20 Gbps) + DP**, not Thunderbolt.

This is the log of what actually worked (2026-09-12).

## What you need

- USB-C cable, Mac → any Type-C port on the Dell
- SSH key already on the box (`~/.ssh/dell_gb10` on the Mac, user `dell`)
- Linux kernel headers on the box (`linux-headers-$(uname -r)`) so you can rebuild `cdc_ncm`

Addresses used here:

| Side | Interface | Address |
| --- | --- | --- |
| Dell | `enx52ff74300b99` | `169.254.67.1/16` |
| Mac | `en4` (Ethernet Adapter) | `169.254.50.165` (IPv4LL, automatic) |

Interface names on the Dell are derived from the NCM MAC. If they change after a replug, pick the `enx52ff…` iface that comes up with the cable and put `169.254.67.1/16` on that one.

SSH alias on the Mac (`~/.ssh/config`):

```
Host dell-usb
    HostName 169.254.67.1
    User dell
    IdentityFile ~/.ssh/dell_gb10
    IdentitiesOnly yes
    Compression no

Host dell-gb10
    HostName 10.158.158.1
    User dell
    IdentityFile ~/.ssh/dell_gb10
    IdentitiesOnly yes
```

## Why stock Linux does not bind

The Mac appears as USB device **`05ac:1905` “Apple Inc. Mac”**, CDC NCM, two functions (ifaces 0 and 2). There is **no interrupt status endpoint**.

Stock `cdc_ncm` already quirks iPhone/iPad (`05ac:12a8`, `05ac:12ab`) as `CDC NCM (Apple Private)`. It does **not** list Mac `1905`. Probe then fails:

```
cdc_ncm 3-1:1.0: bind() failure
cdc_ncm 3-1:1.2: bind() failure
```

`echo 05ac 1905 > /sys/bus/usb/drivers/cdc_ncm/new_id` is not enough. `new_id` attaches the generic NCM info (`FLAG_LINK_INTR`), which still requires the missing status endpoint.

The missing quirk is the same idea as [this linux-kernel patch](https://lists.openwall.net/linux-kernel/2026/04/29/1790): match `05ac:1905` ifaces 0 and 2 with `apple_private_interface_info`.

This box was `6.17.0-1031-nvidia`. That build had 12a8/12ab, not 1905.

## Patch and load `cdc_ncm` on the Dell

Run on the Dell (Wi-Fi SSH is fine for this step):

```bash
mkdir -p /tmp/cdc_ncm_fix && cd /tmp/cdc_ncm_fix
curl -fsSL -o cdc_ncm.c https://raw.githubusercontent.com/torvalds/linux/v6.17/drivers/net/usb/cdc_ncm.c
```

Insert the Mac IDs immediately after the iPad (`0x12ab`) block:

```c
	/* Mac */
	{ USB_DEVICE_INTERFACE_NUMBER(0x05ac, 0x1905, 0),
		.driver_info = (unsigned long)&apple_private_interface_info,
	},
	{ USB_DEVICE_INTERFACE_NUMBER(0x05ac, 0x1905, 2),
		.driver_info = (unsigned long)&apple_private_interface_info,
	},
```

Build and replace the in-tree module. `cdc_mbim` depends on `cdc_ncm`, so unload it first:

```bash
cat > Makefile <<'EOF'
obj-m := cdc_ncm.o
EOF
make -C /lib/modules/$(uname -r)/build M=$PWD modules

sudo rmmod cdc_mbim || true
sudo rmmod cdc_ncm || true
sudo insmod /tmp/cdc_ncm_fix/cdc_ncm.ko
sudo modprobe cdc_mbim || true
```

Success looks like:

```
cdc_ncm 3-1:1.0 usb0: register 'cdc_ncm' at usb-NVDA8000:01-1, CDC NCM (Apple Private), …
cdc_ncm 3-1:1.2 usb1: register 'cdc_ncm' at usb-NVDA8000:01-1, CDC NCM (Apple Private), …
```

udev renames them to `enx52ff74300b99` and `enx52ff74300b79`. Use the first one (iface 0).

### Persist across reboot

```bash
sudo mkdir -p /lib/modules/$(uname -r)/updates
sudo cp /tmp/cdc_ncm_fix/cdc_ncm.ko /lib/modules/$(uname -r)/updates/cdc_ncm.ko
sudo depmod -a
echo cdc_ncm | sudo tee /etc/modules-load.d/cdc_ncm.conf
```

Oneshoot that claims the IP and keeps NetworkManager off the iface:

```ini
# /etc/systemd/system/usb-ncm-ip.service
[Unit]
Description=Assign IP to Apple USB-C NCM
After=network-pre.target
Wants=network-pre.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'for i in $(seq 1 30); do if ip link show enx52ff74300b99 >/dev/null 2>&1; then nmcli dev set enx52ff74300b99 managed no 2>/dev/null || true; ip addr replace 169.254.67.1/16 dev enx52ff74300b99; ip link set enx52ff74300b99 up; exit 0; fi; sleep 1; done; exit 0'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now usb-ncm-ip.service
```

## Bring the link up

On the Dell:

```bash
sudo nmcli dev set enx52ff74300b99 managed no
sudo ip link set enx52ff74300b99 up
sudo ip addr replace 169.254.67.1/16 dev enx52ff74300b99
# stop USB autosuspend from killing a long copy
echo on | sudo tee /sys/bus/usb/devices/3-1/power/control
```

On the Mac, `en4` should already be `status: active` and self-assign `169.254.x.x`. Confirm:

```bash
ifconfig en4
ping -c 2 169.254.67.1
ssh dell-usb 'hostname'
```

Do **not** put a scoped IPv6 address (`fe80::…%en4`) in an rsync dest or raw `HostName`. macOS rsync splits on `:`, and OpenSSH treats `%e` as a config token. If you must use IPv6 in `~/.ssh/config`, write `%%en4`.

IPv4 `169.254.67.1` is the reliable target.

## Copy files

Stop any leftover Wi-Fi rsync first so the two copies do not fight.

```bash
# example: Ollama model blobs + manifest
rsync -av --progress --partial --inplace \
  -e ssh \
  ~/.ollama/models/blobs/sha256-<blob> \
  dell-usb:~/.ollama/models/blobs/

rsync -av -e ssh \
  ~/.ollama/models/manifests/registry.ollama.ai/library/<model>/latest \
  dell-usb:~/.ollama/models/manifests/registry.ollama.ai/library/<model>/latest
```

`--partial --inplace` keeps a truncated dest file if SSH drops, so a retry resumes instead of restarting.

Then on the Dell:

```bash
ollama list
```

## What we measured

| Path | Rate | 3.3 GB `gemma3` |
| --- | --- | --- |
| Wi-Fi (`10.158.158.1`) | 1–2 MB/s, bursty | hours |
| USB-C NCM (this cable) | **~40 MB/s** steady | **~82 s** |

This cable negotiated **USB 2.0 / 480 Mbps** (`lsusb` Bus 003, Mac `en4` media `100baseTX`). 40 MB/s is about the ceiling for that link.

To go faster, replug onto a SuperSpeed port/cable until `lsusb -t` shows the Mac on a `20000M` bus instead of `480M`. The Dell cannot be a USB gadget (`/sys/class/udc` is empty); Linux stays host, the Mac stays device.

## If the copy dies mid-file

The NCM link can drop under load (`Read from remote host … Operation timed out`). Re-apply the Dell IP, ping `169.254.67.1` from the Mac, then rerun the same `rsync --partial --inplace`. Do not start a second rsync over Wi-Fi at the same time.

Also keep NetworkManager from flushing the USB iface (`nmcli dev set … managed no`). That is why the IPv4 address disappeared once after the first bind.
