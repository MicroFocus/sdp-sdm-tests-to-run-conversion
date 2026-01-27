const OctaneSDK = require("@microfocus/alm-octane-js-rest-sdk").Octane;

export class OctaneConnectionUtils {
  public static getNewOctaneConnection(
    octaneServerUrl: string,
    sharedSpace: string,
    workspace: string,
    clientId: string,
    clientSecret: string,
  ) {
    return new OctaneSDK({
      server: octaneServerUrl,
      sharedSpace: sharedSpace,
      workspace: workspace,
      user: clientId,
      password: clientSecret,
      headers: {
        HPECLIENTTYPE: "HPE_CI_CLIENT",
      },
    });
  }
}
