/* Shown the moment a build or tutorial is opened, while the page loads on the server. */
export default function SimulatorLoading() {
  return (
    <div role="status" aria-busy="true" style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#FFF2DF', fontFamily: 'Poppins, system-ui, sans-serif', color: '#1a1a1a' }}>
      <style>{`@keyframes sgSpin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: 'grid', justifyItems: 'center', gap: 14, fontSize: 14, fontWeight: 500 }}>
        <span style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid #FAE3D1', borderTopColor: '#E4121B', animation: 'sgSpin .8s linear infinite' }} />
        Opening the simulator
      </div>
    </div>
  );
}
