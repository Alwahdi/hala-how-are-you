const fs = require("fs");
const path = require("path");
const { withDangerousMod, withGradleProperties } = require("expo/config-plugins");
function replaceOnce(text, before, after) {
  if (!text.includes(before)) throw Error("TCP source changed: review TLS identity patch");
  return text.replace(before, after);
}
function patchAndroid(source) {
  if (source.includes("MIKRO_VERIFY_HOST")) return source;
  let text = replaceOnce(
    source,
    "private boolean closed = true;",
    "private boolean closed = true;\n    private String mikroServerName; // MIKRO_VERIFY_HOST",
  );
  const start = text.indexOf(
    "        if (tlsOptions != null) {",
    text.indexOf("public void connect("),
  );
  const end = text.indexOf("        // Get the addresses", start);
  if (start < 0 || end < start) throw Error("TCP connect structure changed");
  text =
    text.slice(0, start) +
    "        mikroServerName = address;\n        socket = new Socket();\n" +
    text.slice(end);
  text = replaceOnce(
    text,
    "if (socket instanceof SSLSocket) ((SSLSocket) socket).startHandshake();",
    `if (tlsOptions != null) {
            SSLSocket secure = (SSLSocket) getSSLSocketFactory(context, tlsOptions).createSocket(socket, address, port, true);
            secure.setUseClientMode(true);
            javax.net.ssl.SSLParameters parameters = secure.getSSLParameters();
            parameters.setEndpointIdentificationAlgorithm("HTTPS");
            secure.setSSLParameters(parameters);
            socket = secure;
            secure.startHandshake();
        }`,
  );
  text = replaceOnce(
    text,
    "ssf.createSocket(socket, socket.getInetAddress().getHostAddress(), socket.getPort(), true)",
    "ssf.createSocket(socket, mikroServerName, socket.getPort(), true)",
  );
  text = replaceOnce(
    text,
    "sslSocket.setUseClientMode(true);",
    `sslSocket.setUseClientMode(true);
        javax.net.ssl.SSLParameters parameters = sslSocket.getSSLParameters();
        parameters.setEndpointIdentificationAlgorithm("HTTPS");
        sslSocket.setSSLParameters(parameters);`,
  );
  return text;
}
function apply(projectRoot, platform) {
  const base = path.dirname(
    require.resolve("react-native-tcp-socket/package.json", { paths: [projectRoot] }),
  );
  if (JSON.parse(fs.readFileSync(path.join(base, "package.json"))).version !== "6.4.3")
    throw Error("Review the pinned TCP library before upgrading");
  if (platform === "android") {
    const file = path.join(
      base,
      "android/src/main/java/com/asterinet/react/tcpsocket/TcpSocketClient.java",
    );
    fs.writeFileSync(file, patchAndroid(fs.readFileSync(file, "utf8")));
  } else {
    const source = fs.readFileSync(path.join(base, "ios/TcpSocketClient.m"), "utf8");
    if (
      !source.includes("[settings setObject:_host forKey:(NSString *)kCFStreamSSLPeerName]") ||
      !source.includes("_tlsOptionsPending")
    )
      throw Error("Review iOS peer-name verification and TLS-ready event");
  }
}
module.exports = (config) => {
  config = withGradleProperties(config, (value) => {
    value.modResults = value.modResults.filter(
      (item) => item.key !== "EX_DEV_CLIENT_NETWORK_INSPECTOR",
    );
    value.modResults.push({
      type: "property",
      key: "EX_DEV_CLIENT_NETWORK_INSPECTOR",
      value: "false",
    });
    return value;
  });
  config = withDangerousMod(config, [
    "android",
    async (value) => {
      apply(value.modRequest.projectRoot, "android");
      return value;
    },
  ]);
  return withDangerousMod(config, [
    "ios",
    async (value) => {
      apply(value.modRequest.projectRoot, "ios");
      return value;
    },
  ]);
};
module.exports.patchAndroid = patchAndroid;
module.exports.apply = apply;
